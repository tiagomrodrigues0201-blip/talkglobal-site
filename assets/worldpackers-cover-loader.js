(() => {
  const parts = [
    "/assets/worldpackers-cover/01.txt",
    "/assets/worldpackers-cover/02.txt",
    "/assets/worldpackers-cover/03.txt",
    "/assets/worldpackers-cover/04a.txt",
    "/assets/worldpackers-cover/04b.txt",
    "/assets/worldpackers-cover/05.txt",
    "/assets/worldpackers-cover/06.txt",
    "/assets/worldpackers-cover/07.txt"
  ];

  async function applyCover() {
    const images = [...document.querySelectorAll("img[data-worldpackers-cover]")];
    if (!images.length) return;
    try {
      const chunks = await Promise.all(parts.map(async (url) => {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error("cover chunk failed");
        return (await response.text()).trim();
      }));
      const src = "data:image/webp;base64," + chunks.join("");
      images.forEach((image) => {
        image.src = src;
        image.width = 640;
        image.height = 360;
      });
    } catch (error) {
      console.error("Worldpackers cover failed to load", error);
    }
  }

  applyCover();
})();