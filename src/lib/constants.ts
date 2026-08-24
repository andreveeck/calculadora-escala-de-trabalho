export const DEVELOPER_CONTACT = {
  whatsapp: "5551991251325",
  getLink: (appName: string) => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const msg = `Olá André! Vim pelo app ${appName} e gostaria de falar sobre sugestões e negócios. Site: ${currentUrl}`;
    return `https://wa.me/5551991251325?text=${encodeURIComponent(msg)}`;
  },
};
