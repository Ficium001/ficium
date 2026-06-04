export const config = { runtime: "nodejs" };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  const body = req.body;
  return res.status(200).json({
    method: req.method,
    bodyType: typeof body,
    bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
    bodyLength: typeof body === "string" ? body.length : JSON.stringify(body ?? "").length,
    contentType: req.headers["content-type"] ?? "none",
  });
}
