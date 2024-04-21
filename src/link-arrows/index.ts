import { LinkArrow } from "../definitions";
import leftJson from "./left.json";
import rightJson from "./right.json";

// Emoji created by Ice-Pendragon, including implementation concept https://github.com/DawnbrandBots/bastion-bot/issues/311
const leftLinkArrowsEmoji: Record<string, string> = leftJson;
const rightLinkArrowsEmoji: Record<string, string> = rightJson;

const arrowToNumpad: Record<LinkArrow, number> = {
	"↙": 1,
	"⬇": 2,
	"↘": 3,
	"⬅": 4,
	"➡": 6,
	"↖": 7,
	"⬆": 8,
	"↗": 9
};

export function linkArrowsEmoji(arrows: LinkArrow[]): string {
	const leftNumpad: number[] = [];
	const rightNumpad: number[] = [];
	for (const arrow of arrows) {
		const numpad = arrowToNumpad[arrow];
		if (numpad % 3 === 0) {
			rightNumpad.push(numpad);
		} else {
			leftNumpad.push(numpad);
		}
	}
	const leftIndex = leftNumpad.sort().join("") || "0";
	const rightIndex = rightNumpad.sort().join("") || "0";
	return leftLinkArrowsEmoji[leftIndex] + rightLinkArrowsEmoji[rightIndex];
}
