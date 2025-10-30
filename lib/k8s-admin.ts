export const DEFAULT_NAMESPACE = process.env.NEXT_PUBLIC_K8S_ADMIN_DEFAULT_NAMESPACE || "actiontec";
export const DEFAULT_ITEMS_PER_PAGE = Number(process.env.NEXT_PUBLIC_K8S_ADMIN_ITEMS_PER_PAGE || "50");

export function buildListDeploymentsUrl(params?: {
	namespace?: string;
	page?: number;
	itemsPerPage?: number;
	sortBy?: string;
}) {
	const namespace = params?.namespace || DEFAULT_NAMESPACE;
	const page = params?.page ?? 1;
	const itemsPerPage = params?.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE;
	const sortBy = params?.sortBy || "d,creationTimestamp";
	return `/api/k8s/api/v1/deployment/${encodeURIComponent(namespace)}?itemsPerPage=${itemsPerPage}&page=${page}&sortBy=${encodeURIComponent(sortBy)}`;
}

export function buildPodLogsUrl(namespace: string, podName: string, options?: { container?: string; tailLines?: number }) {
	const tailLines = options?.tailLines ?? 500;
	const qs = new URLSearchParams();
	qs.set("tailLines", String(tailLines));
	if (options?.container) qs.set("container", options.container);
	return `/api/k8s/api/v1/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(podName)}/log?${qs.toString()}`;
}

export function buildDeploymentNewReplicaSetUrl(namespace: string, deploymentName: string) {
    return `/api/k8s/api/v1/deployment/${encodeURIComponent(namespace)}/${encodeURIComponent(deploymentName)}/newreplicaset`;
}

export function buildReplicaSetPodsUrl(params: {
    namespace: string;
    replicaSetName: string;
    page?: number;
    itemsPerPage?: number;
    sortBy?: string;
}) {
    const page = params.page ?? 1;
    const itemsPerPage = params.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE;
    const sortBy = params.sortBy || "d,creationTimestamp";
    return `/api/k8s/api/v1/replicaset/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.replicaSetName)}/pod?itemsPerPage=${itemsPerPage}&page=${page}&sortBy=${encodeURIComponent(sortBy)}`;
}

export function buildListNamespacesUrl() {
    return "/api/k8s/api/v1/namespace";
}

export function buildNamespacePodsUrl(params: {
    namespace: string;
    labelSelector?: Record<string, string> | string;
}) {
    const { namespace, labelSelector } = params;
    const base = `/api/k8s/api/v1/namespaces/${encodeURIComponent(namespace)}/pods`;
    if (!labelSelector) return base;
    const ls = typeof labelSelector === "string"
        ? labelSelector
        : Object.entries(labelSelector)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join(",");
    return ls ? `${base}?labelSelector=${ls}` : base;
}

export function buildListPodsUrl(params: {
    namespace: string;
    page?: number;
    itemsPerPage?: number;
    sortBy?: string;
}) {
    const namespace = params.namespace;
    const page = params.page ?? 1;
    const itemsPerPage = params.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE;
    const sortBy = params.sortBy || "d,creationTimestamp";
    return `/api/k8s/api/v1/pod/${encodeURIComponent(namespace)}?itemsPerPage=${itemsPerPage}&page=${page}&sortBy=${encodeURIComponent(sortBy)}`;
}

export function buildGetPodUrl(namespace: string, podName: string) {
    return `/api/k8s/api/v1/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(podName)}`;
}

export function buildPodContainersUrl(namespace: string, podName: string) {
    return `/api/k8s/api/v1/log/source/${encodeURIComponent(namespace)}/${encodeURIComponent(podName)}/pod`;
}

export const K8S_ADMIN_ENDPOINTS = {
	deployments: buildListDeploymentsUrl,
	podLogs: buildPodLogsUrl,
    deploymentNewReplicaSet: buildDeploymentNewReplicaSetUrl,
    replicaSetPods: buildReplicaSetPodsUrl,
    namespaces: buildListNamespacesUrl,
    namespacePods: buildNamespacePodsUrl,
    listPods: buildListPodsUrl,
    getPod: buildGetPodUrl,
    podContainers: buildPodContainersUrl,
};


