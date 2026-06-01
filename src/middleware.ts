import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/onboarding",
    "/onboarding/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/checkout",
    "/checkout/:path*",
    "/continue",
  ],
};
