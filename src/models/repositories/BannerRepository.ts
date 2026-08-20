import type { Banner } from "@/src/models/entities/Banner";

export interface BannerRepository {
  listActiveByPosition(position: Banner["position"]): Promise<Banner[]>;
  recordImpression(bannerId: string): Promise<void>;
  recordClick(bannerId: string): Promise<void>;
}
