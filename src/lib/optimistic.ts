import type { MutationKey, QueryClient, QueryKey } from '@tanstack/react-query';

type WithId = { id: string };

/** Insert or replace `row` in a cached list, optionally keeping it sorted. */
export function upsertById<T extends WithId>(
  list: T[] | undefined,
  row: T,
  compare?: (a: T, b: T) => number,
): T[] {
  const next = [...(list ?? []).filter((item) => item.id !== row.id), row];
  return compare ? next.sort(compare) : next;
}

export function removeById<T extends WithId>(list: T[] | undefined, id: string): T[] {
  return (list ?? []).filter((item) => item.id !== id);
}

/**
 * Runs a mutation registered with setMutationDefaults without a component, the same way
 * useMutation does internally. Offline it pauses and is persisted like any other.
 * Failures are handled by the registered onError, so the promise is not surfaced.
 */
export function enqueue<TVariables>(
  queryClient: QueryClient,
  mutationKey: MutationKey,
  variables: TVariables,
) {
  const mutation = queryClient.getMutationCache().build(queryClient, { mutationKey });
  mutation.execute(variables).catch(() => {});
}

/**
 * Call from a mutation's onSettled. Refetches only when this is the last pending mutation
 * under `mutationKey`; refetching earlier would briefly drop the optimistic rows of writes
 * that are still queued. (The settling mutation still counts as pending here.)
 */
export function invalidateWhenIdle(
  queryClient: QueryClient,
  mutationKey: MutationKey,
  queryKey: QueryKey,
) {
  if (queryClient.isMutating({ mutationKey }) === 1) {
    return queryClient.invalidateQueries({ queryKey });
  }
}
