export const tenants = {
  epikx: {
    id: "epikx",
    fineractTenantId: "default",
    name: "Epikx Finance",
    shortName: "EPIK",
    portalName: "Merchant Trust Management",
    logoUrl: "/epik_logo.png",
    faviconUrl: "/favicon.png",
    theme: {
      primary: "#4586BF",
      secondary: "#7EAED9",
      accent: "#168C40",
      accentLight: "#78BF91",
      loginBackground: "radial-gradient(circle at top left, #7EAED9, transparent 35%), linear-gradient(135deg, #4586BF 0%, #7EAED9 45%, #78BF91 72%, #168C40 100%)",
    },
  },
  tpf: {
    id: "tpf",
    fineractTenantId: "default",
    name: "True Path Finance",
    shortName: "TPF",
    portalName: "Partner Trust Management",
    logoUrl: "/tpf_logo.png",
    faviconUrl: "/tpf_icon.png",
    theme: {
      primary: "#18358C",
      secondary: "#586BA6",
      accent: "#F2A516",
      accentLight: "#F28F16",
      loginBackground: "linear-gradient(135deg, #18358C 0%, #586BA6 100%)",
    },
  },
};

export function getTenantConfig(tenantId) {
  return tenants[tenantId] || tenants.epikx;
}
