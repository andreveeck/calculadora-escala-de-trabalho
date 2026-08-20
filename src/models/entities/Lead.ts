export class Lead {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly consentGiven: boolean,
    public readonly createdAt: string,
  ) {}
}
