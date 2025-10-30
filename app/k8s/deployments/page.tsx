"use client";

import DeploymentsTable from "@/components/k8s/deployments-table";
import DashboardLayout from "@/components/dashboard-layout";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DeploymentsPage() {
	const [currentPage, setCurrentPage] = useState("K8s Deployments");
	const router = useRouter();

	const handlePageChange = useCallback(
		(page: string) => {
			setCurrentPage(page);
			if (page === "K8s Deployments") {
				router.push("/k8s/deployments");
				return;
			}
			const encoded = encodeURIComponent(page);
			router.push(`/?tab=${encoded}`);
		},
		[router]
	);

	return (
		<DashboardLayout currentPage={currentPage} onPageChange={handlePageChange}>
			<div className="p-4 md:p-6">
				<h1 className="text-2xl font-semibold mb-4">Deployments</h1>
				<DeploymentsTable />
			</div>
		</DashboardLayout>
	);
}


