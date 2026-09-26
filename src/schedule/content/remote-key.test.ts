import { FunctionsFetchError } from "@supabase/supabase-js";

import { recoverContentKey } from "./remote-key";

it("Edge Function 오류를 key 없음으로 바꾸지 않는다", async () => {
  const error = new FunctionsFetchError(new Error("네트워크 실패"));
  const client = {
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: null, error }),
    },
  } as never;

  await expect(recoverContentKey(1, client)).rejects.toBe(error);
});
