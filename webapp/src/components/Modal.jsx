import { useEffect } from "react";
import { AnimatePresence, m } from "motion/react";
import Icon from "./Icon";
import "./Modal.css";

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          onMouseDown={(event) =>
            event.target === event.currentTarget && onClose()
          }
        >
          <m.section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.99 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <header className="modal-head">
              <div>
                <h2 id="modal-title">{title}</h2>
                {description ? <p>{description}</p> : null}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                onClick={onClose}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="modal-body">{children}</div>
            {footer ? <footer className="modal-footer">{footer}</footer> : null}
          </m.section>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
