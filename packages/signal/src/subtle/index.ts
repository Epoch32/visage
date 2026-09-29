import { SignalState, type StateOptions } from '../core/state';
import { untrack } from '../core/batch';
import { getActiveConsumer } from '../core/node';

export namespace subtle {
  export const untrackFn = untrack;

  export function currentConsumer() {
    return getActiveConsumer();
  }
}

export { SignalState as State, type StateOptions };
