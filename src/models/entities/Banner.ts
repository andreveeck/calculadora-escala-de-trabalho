export class Banner {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly imageUrl: string,
    public readonly targetUrl: string,
    public readonly position: "result-top" | "result-bottom" | "sidebar",
    public readonly active: boolean,
    public readonly sortOrder: number,
  ) {}
}
