import { DataType } from "@msgpack-audio-viewer/common";
import { RingBuffer } from "./RingBuffer";

const bufferPageSize = 3;

export class PageState {
  public pages: RingBuffer<number>;
  public data: RingBuffer<DataType>;
  public maxPage: number;
  public minPage: number;
  public pageSize: number;
  public hasNextPage: boolean;

  public get hasPreviousPage(): boolean {
    return this.minPage > 1;
  }

  public get maxIndex(): number {
    return this.maxPage * this.pageSize;
  }

  public get minIndex(): number {
    return this.minPage * this.pageSize;
  }

  private constructor(
    pageSize: number,
    pages: RingBuffer<number>,
    data: RingBuffer<DataType>,
    hasNextPage: boolean,
  ) {
    this.pageSize = pageSize;
    this.pages = pages;
    this.data = data;

    const pageBuffer = this.pages.getBuffer();
    this.maxPage = Math.max(...pageBuffer);
    this.minPage = Math.min(...pageBuffer);
    this.hasNextPage = hasNextPage;
  }

  public static create(pageSize: number): PageState;
  public static create(
    pageSize: number,
    pageNumber: number,
    pageData: DataType[],
    hasNextPage: boolean,
  ): PageState;
  public static create(
    pageSize: number,
    pageNumber?: number,
    pageData?: DataType[],
    hasNextPage?: boolean,
  ): PageState {
    const pages = pageNumber
      ? new RingBuffer(bufferPageSize, [pageNumber])
      : new RingBuffer<number>(bufferPageSize);
    const data = pageData
      ? new RingBuffer(bufferPageSize * pageSize, pageData)
      : new RingBuffer<DataType>(bufferPageSize * pageSize);

    return new PageState(pageSize, pages, data, hasNextPage ?? false);
  }

  public addPageData(
    pageNumber: number,
    data: DataType[],
    hasNextPage: boolean,
  ): PageState {
    const isForward = pageNumber >= (this.pages.getLatest() ?? 0);

    function buildNewPages(pages: RingBuffer<number>): RingBuffer<number> {
      const hasPage = pages.includes(pageNumber);
      if (hasPage) {
        return pages;
      }
      return isForward ? pages.push(pageNumber) : pages.unshift(pageNumber);
    }

    const newPages = buildNewPages(this.pages);
    const newData = isForward
      ? this.data.push(...data)
      : this.data.unshift(...data.reverse());

    return new PageState(this.pageSize, newPages, newData, hasNextPage);
  }
}
