import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE_URL = process.env.K8S_ADMIN_BASE_URL;
const ADMIN_COOKIE = process.env.K8S_ADMIN_COOKIE;

function buildTargetUrl(pathname: string, search: string): string {
	if (!BASE_URL) {
		throw new Error("K8S_ADMIN_BASE_URL is not configured");
	}
	const base = BASE_URL.replace(/\/$/, "");
	const path = pathname.replace(/^\/api\/k8s/, "");
	const url = `${base}${path || "/"}`;
	return search ? `${url}?${search}` : url;
}

async function forward(request: Request) {
	const url = new URL(request.url);
	const targetUrl = buildTargetUrl(url.pathname, url.searchParams.toString());

    console.log("proxy url", targetUrl);
    
	const incoming = await headers();
	const cookieStore = await cookies();
	const adminCookie = ADMIN_COOKIE || cookieStore.get("K8S_ADMIN_COOKIE")?.value;
	// Pass-through selected headers; override Authorization with admin token if provided
	const outHeaders: Record<string, string> = {};
	const accept = incoming.get("accept");
	if (accept) outHeaders["accept"] = accept as string;
	// 轉發 Cookie：合併瀏覽器原有 Cookie 與 K8S_ADMIN_COOKIE
	const incomingCookie = incoming.get("cookie") || "";
	let composedCookie = incomingCookie;
	if (adminCookie) {
		const formatted = adminCookie.includes("=") ? adminCookie : `K8S_ADMIN_COOKIE=${adminCookie}`;
		composedCookie = composedCookie ? `${composedCookie}; ${formatted}` : formatted;
	}
	if (composedCookie) {
		outHeaders["cookie"] = composedCookie;
	}

	const hasBody = !(request.method === "GET" || request.method === "HEAD");
	const body = hasBody ? await request.clone().arrayBuffer() : undefined;
	if (hasBody) {
		outHeaders["content-type"] = incoming.get("content-type") || "application/json";
	}

	const init: RequestInit = {
		method: request.method,
		headers: outHeaders,
		body,
	};

	const res = await fetch(targetUrl, init);
    // console.log("proxy status", await res.json());
	const resHeaders = new Headers();
	res.headers.forEach((value, key) => {
		// Restrict hop-by-hop headers and strip encoding/length to re-pack body
		if (![
			"connection",
			"transfer-encoding",
			"keep-alive",
			"proxy-authenticate",
			"proxy-authorization",
			"te",
			"trailer",
			"upgrade",
			"content-encoding",
			"content-length",
		].includes(key.toLowerCase())) {
			resHeaders.set(key, value);
		}
	});

	// Re-pack to ArrayBuffer to avoid stream stalls in some environments
	const buf = await res.arrayBuffer();
	return new NextResponse(buf, { status: res.status, headers: resHeaders });
}

export async function GET(request: Request) {
	try {
		return await forward(request);
	} catch (error: unknown) {
		return NextResponse.json({ message: (error as Error).message }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		return await forward(request);
	} catch (error: unknown) {
		return NextResponse.json({ message: (error as Error).message }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	try {
		return await forward(request);
	} catch (error: unknown) {
		return NextResponse.json({ message: (error as Error).message }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		return await forward(request);
	} catch (error: unknown) {
		return NextResponse.json({ message: (error as Error).message }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		return await forward(request);
	} catch (error: unknown) {
		return NextResponse.json({ message: (error as Error).message }, { status: 500 });
	}
}


