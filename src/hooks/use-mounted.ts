"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** クライアントでマウント済みかどうか（SSR 中は false）。effect で setState せずに判定する。 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
