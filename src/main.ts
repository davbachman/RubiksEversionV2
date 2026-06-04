import "./styles.css";
import { RubiksEversionGame } from "./game";

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
  }
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root");

const game = new RubiksEversionGame(root);
game.start();

window.render_game_to_text = () => game.renderGameToText();
window.advanceTime = (ms: number) => game.advanceTime(ms);

