import { Got } from "got";
import { FactoryProvider } from "tsyringe";
import { getLogger } from "./logger";

interface LimitRegulationVector {
	date: string;
	regulation: Record<string, number>;
}

export class UpdatingLimitRegulationVector {
	#logger = getLogger("limit-regulation");

	protected interval: NodeJS.Timeout;
	protected vector: Map<number, number> = new Map();

	constructor(
		private got: Got,
		private url: string
	) {
		// Promise can resolve after constructor, just don't until next trigger to populate
		this.update(true);
		this.interval = setInterval(() => this.update(), 60000).unref();
	}

	protected async update(initial = false): Promise<void> {
		// Synchronise on the hour
		if (initial || new Date().getMinutes() === 0) {
			this.#logger.info(`Updating from [${this.url}]`);
			try {
				const { regulation } = await this.got(this.url, {
					throwHttpErrors: true
				}).json<LimitRegulationVector>();
				this.vector.clear();
				for (const key in regulation) {
					this.vector.set(Number(key), regulation[key]);
				}
				this.#logger.info(`Read ${this.vector.size} entries`);
			} catch (error) {
				this.#logger.warn(error);
			}
		}
	}

	get(konamiId: number): number | undefined {
		return this.vector.get(konamiId);
	}

	/**
	 * Use to clean up this object, after which it should not be used.
	 */
	finalise(): void {
		clearInterval(this.interval);
		this.vector.clear();
	}
}

export const rushLimitRegulationVectorFactory: FactoryProvider<UpdatingLimitRegulationVector> = {
	useFactory: container =>
		new UpdatingLimitRegulationVector(
			container.resolve("got"),
			"https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/rush/current.vector.json"
		)
};
