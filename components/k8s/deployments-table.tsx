"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_NAMESPACE, DEFAULT_ITEMS_PER_PAGE, buildListDeploymentsUrl, buildPodLogsUrl, buildDeploymentNewReplicaSetUrl, buildReplicaSetPodsUrl } from "@/lib/k8s-admin";
import { useRouter } from "next/navigation";

type K8sObjectMeta = {
	name: string;
	namespace?: string;
	labels?: Record<string, string>;
	creationTimestamp?: string;
};

type DeploymentItem = {
	metadata: K8sObjectMeta;
	spec?: {
		replicas?: number;
        selector?: { matchLabels?: Record<string, string> };
	};
	status?: {
		readyReplicas?: number;
		availableReplicas?: number;
		updatedReplicas?: number;
	};
};

type DeploymentList = {
	items: DeploymentItem[];
};

export default function DeploymentsTable() {
    const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<DeploymentItem[]>([]);
	const [q, setQ] = useState("");
	const searchInputRef = useRef<HTMLInputElement | null>(null);
    const [ns, setNs] = useState(DEFAULT_NAMESPACE);
    const [namespaces, setNamespaces] = useState<string[]>([]);
    const [perPage, setPerPage] = useState<number>(DEFAULT_ITEMS_PER_PAGE);
    const [totalItems, setTotalItems] = useState<number | null>(null);
    const [statusSummary, setStatusSummary] = useState<any>(null);
    const [logOpen, setLogOpen] = useState(false);
    const [logLoading, setLogLoading] = useState(false);
    const [logError, setLogError] = useState<string | null>(null);
    const [logContent, setLogContent] = useState<string>("");
    const [logTitle, setLogTitle] = useState<string>("");
    const [rsName, setRsName] = useState<string | null>(null);
    const [podsInDialog, setPodsInDialog] = useState<any[]>([]);
    const [selectedPod, setSelectedPod] = useState<string | null>(null);
    const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
    const [podsFilter, setPodsFilter] = useState<string>("");

	async function fetchDeployments(params?: { namespace?: string; itemsPerPage?: number }) {
		setLoading(true);
		setError(null);
		try {
			// 使用 k8s-admin 平台 API
			const effectiveNs = params?.namespace ?? ns;
			const effectivePerPage = params?.itemsPerPage ?? perPage;
			const url = buildListDeploymentsUrl({ namespace: effectiveNs, page: 1, itemsPerPage: effectivePerPage, sortBy: "d,creationTimestamp" });
			const res = await fetch(url, { cache: "no-store" });
			if (!res.ok) throw new Error(`Failed: ${res.status}`);
			const body: any = await res.json();

			setTotalItems(body?.listMeta?.totalItems ?? null);
			setStatusSummary(body?.status ?? null);

			const deploymentsArr = body?.deployments || body?.items || [];
			const items: DeploymentItem[] = deploymentsArr.map((d: any) => ({
				metadata: {
					name: d?.objectMeta?.name,
					namespace: d?.objectMeta?.namespace,
					labels: d?.objectMeta?.labels,
					creationTimestamp: d?.objectMeta?.creationTimestamp,
				},
				spec: {
					replicas: d?.pods?.desired ?? d?.pods?.current,
					selector: {
						matchLabels: d?.selector?.matchLabels
							|| d?.spec?.selector?.matchLabels
							|| d?.labelSelector?.matchLabels
							|| d?.objectMeta?.labels
					},
				},
				status: {
					readyReplicas: d?.pods?.running ?? 0,
					availableReplicas: d?.pods?.running ?? 0,
					updatedReplicas: d?.pods?.current ?? 0,
				},
			}));
			setData(items);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	async function fetchNamespaces() {
		try {
			const res = await fetch("/api/k8s/api/v1/namespace", { cache: "no-store" });
			if (!res.ok) throw new Error(`List namespaces failed: ${res.status}`);
			const body: any = await res.json();
			const items: string[] = (body?.namespaces ?? body?.items ?? [])
				.map((n: any) => n?.objectMeta?.name || n?.metadata?.name)
				.filter(Boolean);
			setNamespaces(items);
			// 若當前 ns 不在清單中，預設為第一個
			if (items.length > 0 && !items.includes(ns)) {
				setNs(items[0]);
			}
		} catch (e) {
			// 忽略 namespaces 錯誤以不影響主流程，但保留使用者可輸入
		}
	}

	useEffect(() => {
		fetchDeployments();
		fetchNamespaces();
	}, []);

	useEffect(() => {
		// 頁面載入後自動聚焦搜尋欄
		searchInputRef.current?.focus();
	}, []);

	const filtered = useMemo(() => {
		if (!q) return data;
		const term = q.toLowerCase();
		return data.filter((d) => {
			const name = d.metadata?.name || "";
			const ns = d.metadata?.namespace || "default";
			return `${ns}/${name}`.toLowerCase().includes(term);
		});
	}, [q, data]);

	async function handleViewLogs(dep: DeploymentItem) {
		const ns = dep.metadata?.namespace || "default";
		const name = dep.metadata?.name || "";
		setLogTitle(`${ns}/${name}`);
		setLogOpen(true);
		setLogLoading(true);
		setLogError(null);
		setLogContent("");
	setPodsInDialog([]);
	setSelectedPod(null);
	setSelectedContainer(null);
	setRsName(null);

		try {
			// 1) 先查 newreplicaset 拿 RS 名稱，再走 replicaset/{rs}/pod 列表拿 pods
			const rsUrl = buildDeploymentNewReplicaSetUrl(ns, name);
			let pods: any[] | null = null;
			let replicaSetName: string | null = null;
			try {
				const rsRes = await fetch(rsUrl, { cache: "no-store" });
				if (rsRes.ok) {
					const rsBody: any = await rsRes.json();
					// 嘗試從各種欄位取得 RS 名稱
					replicaSetName = rsBody?.objectMeta?.name || rsBody?.name || rsBody?.rsName || rsBody?.metadata?.name || null;
					if (replicaSetName) setRsName(replicaSetName);
					// 若 newreplicaset 直接附帶 pods，就先用
					pods = rsBody?.pods || rsBody?.items || rsBody?.data?.pods || null;
				}
			} catch {}

			// 若 newreplicaset 沒附帶 pods，但取得了 RS 名稱，走 replicaset pods 端點
			if ((!pods || pods.length === 0) && replicaSetName) {
				const listPodsUrl = buildReplicaSetPodsUrl({ namespace: ns, replicaSetName, page: 1, itemsPerPage: 50, sortBy: "d,creationTimestamp" });
				const listRes = await fetch(listPodsUrl, { cache: "no-store" });
				if (listRes.ok) {
					const listBody: any = await listRes.json();
					pods = listBody?.pods || listBody?.items || listBody?.data?.pods || [];
				}
			}

			// 2) 若 rs 端點無資料，回退：使用 labelSelector 方式列出 Pods
			if (!pods || pods.length === 0) {
				const matchLabels = dep.spec?.selector?.matchLabels || {};
				let selectorObj: Record<string, string> = { ...matchLabels };
				if (Object.keys(selectorObj).length === 0) {
					const metaLabels = dep.metadata?.labels || {};
					if (metaLabels["app.kubernetes.io/name"]) selectorObj["app.kubernetes.io/name"] = metaLabels["app.kubernetes.io/name"] as unknown as string;
					else if (metaLabels["app"]) selectorObj["app"] = metaLabels["app"] as unknown as string;
				}
				const labelSelector = Object.entries(selectorObj)
					.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
					.join(",");
				let podsUrl = `/api/k8s/api/v1/namespaces/${encodeURIComponent(ns)}/pods` + (labelSelector ? `?labelSelector=${labelSelector}` : "");
				let podsRes = await fetch(podsUrl, { cache: "no-store" });
				if (!podsRes.ok && labelSelector) {
					podsUrl = `/api/k8s/api/v1/namespaces/${encodeURIComponent(ns)}/pods`;
					podsRes = await fetch(podsUrl, { cache: "no-store" });
				}
				if (!podsRes.ok) throw new Error(`List pods failed: ${podsRes.status}`);
				const podsBody: { items: any[] } = await podsRes.json();
				pods = podsBody?.items || [];
			}

            if (!pods || pods.length === 0) throw new Error("找不到相關 Pods");
            // 排序：Ready > 未 Ready，其次建立時間新到舊
            const sorted = (pods as any[]).slice().sort((a, b) => {
                const ar = isPodReady(a) ? 1 : 0;
                const br = isPodReady(b) ? 1 : 0;
                if (br !== ar) return br - ar;
                const at = new Date(getPodCreationTimestamp(a) || 0).getTime();
                const bt = new Date(getPodCreationTimestamp(b) || 0).getTime();
                return bt - at;
            });
            setPodsInDialog(sorted);

			// 2) 選擇一個最合適的 Pod（優先 Ready 狀態）
			const pickPod = (pods as any[]).sort((a, b) => {
				const aReady = isPodReady(a) ? 1 : 0;
				const bReady = isPodReady(b) ? 1 : 0;
				return bReady - aReady;
			})[0];
			const podName = getPodName(pickPod);
			if (!podName) throw new Error("Pod 名稱缺失");

			// 僅預選第一個 Pod 與容器，不自動抓取日誌（由使用者點擊清單中的按鈕觸發）
			const containers = getPodContainers(pickPod);
			const containerName = containers?.[0]?.name as string | undefined;
			setSelectedPod(podName);
			if (containerName) setSelectedContainer(containerName);
		} catch (e) {
			setLogError((e as Error).message);
		} finally {
			setLogLoading(false);
		}
	}

	async function fetchLogsFor(podName: string, container?: string) {
		try {
			setSelectedPod(podName);
			if (container) setSelectedContainer(container);
			setLogLoading(true);
			setLogError(null);
			setLogContent("");
			const logRes = await fetch(buildPodLogsUrl(ns, podName, { container: container || undefined, tailLines: 500 }), { cache: "no-store" });
			if (!logRes.ok) throw new Error(`Fetch logs failed: ${logRes.status}`);
			const text = await logRes.text();
			setLogContent(text || "(無日誌內容)");
		} catch (e) {
			setLogError((e as Error).message);
		} finally {
			setLogLoading(false);
		}
	}

	function openInApiLogViewer(podName: string, container?: string) {
		setLogOpen(false);
		const url = `/?tab=${encodeURIComponent("API Log Viewer")}&ns=${encodeURIComponent(ns)}&pod=${encodeURIComponent(podName)}${container ? `&container=${encodeURIComponent(container)}` : ""}`;
		router.push(url);
	}

	function isPodReady(pod: any): boolean {
		try {
			const conditions = pod?.status?.conditions || [];
			return conditions.some((c: any) => c.type === "Ready" && c.status === "True");
		} catch {
			return false;
		}
	}

function getPodName(p: any): string | null {
    return (
        p?.metadata?.name ||
        p?.objectMeta?.name ||
        p?.name ||
        null
    );
}

function getPodContainers(p: any): any[] {
    return (
        p?.spec?.containers ||
        p?.podSpec?.containers ||
        []
    );
}

function getPodPhase(p: any): string {
    return p?.status?.phase || p?.podStatus?.phase || "-";
}

function getPodRestarts(p: any): number {
    const statuses = p?.status?.containerStatuses || p?.podStatus?.containerStatuses || [];
    return statuses.reduce((sum: number, cs: any) => sum + (cs?.restartCount || 0), 0);
}

function getPodNode(p: any): string {
    return p?.spec?.nodeName || p?.podSpec?.nodeName || "-";
}

function getPodCreationTimestamp(p: any): string | null {
    return p?.metadata?.creationTimestamp || p?.objectMeta?.creationTimestamp || null;
}

function getPodIP(p: any): string | null {
    return p?.status?.podIP || p?.podStatus?.podIP || null;
}

function getContainerNames(p: any): string[] {
    return (getPodContainers(p) || []).map((c: any) => c?.name).filter(Boolean);
}

function getReadyCounts(p: any): { ready: number; total: number } {
    const statuses = p?.status?.containerStatuses || p?.podStatus?.containerStatuses || [];
    const total = statuses.length;
    const ready = statuses.reduce((sum: number, cs: any) => sum + (cs?.ready ? 1 : 0), 0);
    return { ready, total };
}

	return (
		<div className="space-y-4">
			<div className="flex gap-2 items-center">
				<Input
					placeholder="搜尋 namespace/name"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					ref={searchInputRef}
					className="max-w-xs"
				/>
				<div className="min-w-[160px]">
					<Select value={ns} onValueChange={(value) => { setNs(value); fetchDeployments({ namespace: value }); }}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="namespace" />
						</SelectTrigger>
						<SelectContent>
							{(namespaces.length > 0 ? namespaces : [ns]).map((n) => (
								<SelectItem key={n} value={n}>{n}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Input
					placeholder="items/page"
					value={perPage}
					onChange={(e) => setPerPage(Number(e.target.value) || DEFAULT_ITEMS_PER_PAGE)}
					className="max-w-[120px]"
				/>
				<Button variant="secondary" onClick={() => fetchDeployments()} disabled={loading}>
					重新整理
				</Button>
				{loading ? <Spinner className="ml-2" /> : null}
			</div>

			{error ? <div className="text-red-600">{error} {error.includes("401") || error.includes("403") ? "(請確認已設定 K8S_ADMIN_COOKIE)" : null}</div> : null}

			{totalItems !== null || statusSummary ? (
				<div className="text-sm text-muted-foreground">
					{totalItems !== null ? <span>總筆數: {totalItems}</span> : null}
					{statusSummary ? (
						<span className="ml-3">狀態: running {statusSummary.running} / pending {statusSummary.pending} / failed {statusSummary.failed}</span>
					) : null}
				</div>
			) : null}

			<div className="border rounded-md overflow-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Namespace</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>Replicas</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Age</TableHead>
							<TableHead>Logs</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-muted-foreground">無資料。請確認 namespace、權限與 Cookie 設定。</TableCell>
							</TableRow>
						) : null}
						{filtered.map((d) => {
							const ns = d.metadata?.namespace || "default";
							const name = d.metadata?.name || "";
							const desired = d.spec?.replicas ?? 0;
							const ready = d.status?.readyReplicas ?? 0;
							const available = d.status?.availableReplicas ?? 0;
							const updated = d.status?.updatedReplicas ?? 0;
							const age = d.metadata?.creationTimestamp ? timeSince(new Date(d.metadata.creationTimestamp)) : "-";
							return (
								<TableRow key={`${ns}/${name}`}>
									<TableCell className="whitespace-nowrap">{ns}</TableCell>
									<TableCell className="font-medium">{name}</TableCell>
									<TableCell>
										{ready}/{desired} <Badge variant="outline" className="ml-2">avail {available}</Badge> <Badge variant="secondary" className="ml-2">upd {updated}</Badge>
									</TableCell>
									<TableCell>
										{ready === desired && desired > 0 ? (
											<Badge variant="default">Healthy</Badge>
										) : (
											<Badge variant="destructive">Degraded</Badge>
										)}
									</TableCell>
									<TableCell>{age}</TableCell>
									<TableCell>
								<Button size="sm" onClick={() => handleViewLogs(d)} disabled={logLoading}>
									查看 Pods
								</Button>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			<Dialog open={logOpen} onOpenChange={setLogOpen}>
				<DialogContent className="w-[96vw] sm:w-[96vw] !max-w-[96vw] sm:!max-w-[1600px]">
					<DialogHeader>
						<DialogTitle>Deployment Logs - {logTitle}</DialogTitle>
					</DialogHeader>
					<div className="mb-3 text-xs text-muted-foreground">
						{rsName ? <span>ReplicaSet: <span className="font-mono">{rsName}</span></span> : null}
					</div>
					{podsInDialog.length > 0 ? (
						<div className="mb-3 overflow-auto border rounded">
							<div className="p-2">
								<Input
									placeholder="篩選 pod 名稱..."
									value={podsFilter}
									onChange={(e) => setPodsFilter(e.target.value)}
									className="max-w-sm"
								/>
							</div>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Pod</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Ready</TableHead>
										<TableHead>Restarts</TableHead>
										<TableHead>Node</TableHead>
										<TableHead>IP</TableHead>
										<TableHead>Age</TableHead>
										<TableHead>Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{podsInDialog
										.filter((p: any) => !podsFilter || (getPodName(p) || "").toLowerCase().includes(podsFilter.toLowerCase()))
										.map((p: any) => {
											const podName = getPodName(p) as string;
											const phase = getPodPhase(p);
											const restarts = getPodRestarts(p);
											const node = getPodNode(p);
											const created = getPodCreationTimestamp(p);
											const age = created ? timeSince(new Date(created)) : "-";
											const firstContainer = getPodContainers(p)?.[0]?.name as string | undefined;
											const { ready, total } = getReadyCounts(p);
											const ip = getPodIP(p) || "-";
											return (
												<TableRow key={podName} className={selectedPod === podName ? "bg-muted" : undefined}>
													<TableCell className="font-mono">{podName}</TableCell>
													<TableCell>
														{phase === "Running" ? <Badge variant="default">{phase}</Badge> : phase === "Pending" ? <Badge variant="secondary">{phase}</Badge> : <Badge variant="destructive">{phase}</Badge>}
													</TableCell>
													<TableCell>{ready}/{total}</TableCell>
													<TableCell>{restarts}</TableCell>
													<TableCell>{node}</TableCell>
													<TableCell className="font-mono">{ip}</TableCell>
													<TableCell>{age}</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
											<Select value={selectedPod === podName ? (selectedContainer || firstContainer) : firstContainer}
												onValueChange={(v) => { setSelectedPod(podName); setSelectedContainer(v); }}>
																<SelectTrigger className="w-[160px]">
																	<SelectValue placeholder="選擇容器" />
																</SelectTrigger>
																<SelectContent>
																	{getContainerNames(p).map((cn) => (
																		<SelectItem key={cn} value={cn}>{cn}</SelectItem>
																	))}
																</SelectContent>
															</Select>
											<Button size="sm" variant="secondary" onClick={() => openInApiLogViewer(podName, selectedPod === podName ? selectedContainer || firstContainer : firstContainer)}>
												在 API Log Viewer 打開
															</Button>
														</div>
													</TableCell>
												</TableRow>
											);
										})}
								</TableBody>
							</Table>
						</div>
					) : null}
					{(selectedPod || logLoading || logError || (logContent && logContent.length > 0)) ? (
						<div className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-sm">
							{logLoading ? (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Spinner />
									<span>載入中...</span>
								</div>
							) : logError ? (
								<div className="text-red-600">{logError}</div>
							) : (
								<pre className="whitespace-pre-wrap break-words">{logContent}</pre>
							)}
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}

//

function timeSince(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	const intervals: [number, string][] = [
		[31536000, "y"],
		[2592000, "mo"],
		[604800, "w"],
		[86400, "d"],
		[3600, "h"],
		[60, "m"],
		[1, "s"],
	];
	for (const [secs, label] of intervals) {
		const count = Math.floor(seconds / secs);
		if (count >= 1) return `${count}${label}`;
	}
	return "0s";
}


