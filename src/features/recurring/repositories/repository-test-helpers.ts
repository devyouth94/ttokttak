type AwaitableQuery<T> = Record<string, jest.Mock> & {
  then: PromiseLike<T>["then"];
};

/**
 * Supabase query builder처럼 체이닝 가능하고 await도 가능한 테스트 더블을 만든다.
 */
export function createAwaitableQuery<T>(
  result: T,
  chainMethods: string[]
): AwaitableQuery<T> {
  const query = {} as AwaitableQuery<T>;

  for (const methodName of chainMethods) {
    query[methodName] = jest.fn(() => query);
  }

  query.then = ((onfulfilled) =>
    Promise.resolve(
      onfulfilled ? onfulfilled(result) : result
    )) as PromiseLike<T>["then"];

  return query;
}
