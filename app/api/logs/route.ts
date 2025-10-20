import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiUrl = searchParams.get("apiUrl")
    const authToken = searchParams.get("authToken")

    if (!apiUrl) {
      return NextResponse.json({ error: "API URL is required" }, { status: 400 })
    }

    // 尽量只转发必要头，避免影响目标服务的返回类型
    const headers: HeadersInit = {}

    if (authToken) {
      headers["Cookie"] = authToken
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
    })

    // 透传响应（支持 JSON / TEXT / HTML 等）
    const contentType = response.headers.get("content-type") || ""
    const bodyText = await response.text()
    return new NextResponse(bodyText, {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    })
  } catch (error) {
    console.error("[v0] API proxy error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { apiUrl, authToken } = await request.json()

    if (!apiUrl) {
      return NextResponse.json({ error: "API URL is required" }, { status: 400 })
    }

    const headers: HeadersInit = {}

    if (authToken) {
      headers["Cookie"] = authToken
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
    })

    const contentType = response.headers.get("content-type") || ""
    const bodyText = await response.text()
    return new NextResponse(bodyText, {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    })
  } catch (error) {
    console.error("[v0] API proxy error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
