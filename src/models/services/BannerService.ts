import type { Banner } from "@/src/models/entities/Banner";
import type { BannerRepository } from "@/src/models/repositories/BannerRepository";

export class BannerService {
  constructor(private readonly bannerRepository: BannerRepository) {}

  async getBannerForPosition(position: Banner["position"]): Promise<Banner | null> {
    const banners = await this.bannerRepository.listActiveByPosition(position);
    if (banners.length === 0) {
      return null;
    }

    const index = Math.floor(Date.now() / 60_000) % banners.length;
    const banner = banners[index];
    await this.bannerRepository.recordImpression(banner.id);
    return banner;
  }

  async recordClick(bannerId: string): Promise<void> {
    await this.bannerRepository.recordClick(bannerId);
  }
}
