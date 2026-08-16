export default function ResilientImage({ src, ...props }) {
  function retryOnce(event) {
    const image = event.currentTarget;
    if (image.dataset.retried) return;
    image.dataset.retried = "true";
    const separator = image.src.includes("?") ? "&" : "?";
    image.src = `${image.src}${separator}retry=${Date.now()}`;
  }

  return <img src={src} onError={retryOnce} {...props} />;
}
