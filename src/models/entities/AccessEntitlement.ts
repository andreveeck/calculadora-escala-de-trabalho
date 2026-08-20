export class AccessEntitlement {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly product: "annual-calendar",
    public readonly grantedAt: string,
    public readonly lifetime: boolean,
  ) {}
}
