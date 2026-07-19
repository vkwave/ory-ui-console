import { requireAdmin } from "@/lib/auth/require-admin"

export const GET = async (): Promise<Response> => {
  const admin = await requireAdmin(false)
  return Response.json(
    {
      csrfToken: admin.csrfToken,
      subject: admin.subject,
      roles: admin.roles,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
