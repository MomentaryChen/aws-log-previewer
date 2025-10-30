import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => ({}));
		const token: string | undefined = body.token || undefined;
		if (!token) {
			return NextResponse.json({ message: "token is required" }, { status: 400 });
		}
		const cookieStore = await cookies();
	cookieStore.set({
		name: "K8S_ADMIN_COOKIE",
			value: token,
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "lax",
		});
		return NextResponse.json({ message: "ok" });
	} catch (e) {
		return NextResponse.json({ message: (e as Error).message }, { status: 500 });
	}
}

export async function DELETE() {
	try {
		const cookieStore = await cookies();
	cookieStore.set({ name: "K8S_ADMIN_COOKIE", value: "", path: "/", maxAge: 0 });
		return NextResponse.json({ message: "cleared" });
	} catch (e) {
		return NextResponse.json({ message: (e as Error).message }, { status: 500 });
	}
}


