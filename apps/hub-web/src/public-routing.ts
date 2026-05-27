type PublicRouteLocation = {
  hostname: string;
  pathname: string;
};

export function shouldRenderPublicLanding(location: PublicRouteLocation) {
  return (
    location.hostname === "prymeiradigital.com.br" ||
    location.hostname === "www.prymeiradigital.com.br" ||
    location.pathname === "/landing-preview"
  );
}
