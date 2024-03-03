import { useEffect } from "react";

export function useOnMount(effect: React.EffectCallback) {
  // @ts-expect-error ⚠️ 1.2.5
  return useEffect(effect, []);
}
