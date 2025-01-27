import { createComputed, untrack, Accessor, createSignal, Setter, onCleanup } from "./signal";

function getSymbol() {
  const SymbolCopy = Symbol as any;
  return SymbolCopy.observable || "@@observable";
}

export type ObservableObserver<T> =
  | ((v: T) => void)
  | {
      next: (v: T) => void;
      error?: (v: any) => void;
      complete?: (v: boolean) => void;
    };
export function observable<T>(input: Accessor<T>) {
  const $$observable = getSymbol();
  return {
    subscribe(observer: ObservableObserver<T>) {
      if (!(observer instanceof Object) || observer == null) {
        throw new TypeError("Expected the observer to be an object.");
      }
      const handler = "next" in observer ? observer.next : observer;
      let complete = false;
      createComputed(() => {
        if (complete) return;
        const v = input();
        untrack(() => handler(v));
      });
      return {
        unsubscribe() {
          complete = true;
        }
      };
    },
    [$$observable]() {
      return this;
    }
  };
}

export function from<T>(producer: ((setter: Setter<T>) =>  () => void) | {
  subscribe: (fn: (v: T) => void) => (() => void) | { unsubscribe: () => void };
}): Accessor<T> {
  const [s, set] = createSignal<T | undefined>(undefined, { equals: false }) as [Accessor<T>, Setter<T>];
  if ("subscribe" in producer) {
    const unsub = producer.subscribe((v) => set(() => v));
    onCleanup(() => "unsubscribe" in unsub ? unsub.unsubscribe() : unsub())
  } else {
    const clean = producer(set);
    onCleanup(clean);
  }
  return s;
}