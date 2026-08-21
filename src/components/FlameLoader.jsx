import { motion } from "framer-motion";
import { Flame } from "lucide-react";

/**
 * Substitui o spinner circular genérico por uma chama que "acende e
 * se apaga" em loop — mesma ideia do ícone da Home/topbar, só que
 * animada. Puramente decorativo, então ignora prefers-reduced-motion
 * apenas na duração (a regra global em animations.css já reduz drasticamente
 * qualquer animation-duration quando o usuário pede menos movimento).
 */
export function FlameLoader({ size = 40 }) {
  return (
    <motion.div
      className="flame-loader"
      style={{ width: size, height: size }}
      animate={{
        scale: [0.82, 1.12, 0.9, 1.05, 0.82],
        opacity: [0.55, 1, 0.75, 0.95, 0.55],
        rotate: [-4, 3, -2, 4, -4],
        color: ["var(--text-muted)", "var(--accent)", "var(--accent-dark)", "var(--accent)", "var(--text-muted)"],
      }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <Flame size={size} strokeWidth={1.75} />
    </motion.div>
  );
}
