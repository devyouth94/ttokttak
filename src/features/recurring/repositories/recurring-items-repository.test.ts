import { archiveRecurringItem } from "~/features/recurring/repositories/recurring-items-repository";

describe("recurring items repository", () => {
  it("리마인더 삭제는 archive와 pending job 취소를 묶은 RPC로 처리한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    await archiveRecurringItem({
      client: { rpc } as never,
      id: "item-1",
      userId: "user-1",
    });

    expect(rpc).toHaveBeenCalledWith("archive_recurring_item", {
      p_item_id: "item-1",
    });
  });
});
