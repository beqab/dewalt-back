import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsArticle, NewsArticleDocument } from './entities/news.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { FrontRevalidateService } from '../revalidate/front-revalidate.service';
import { FRONT_NEWS_TAGS } from '../revalidate/front-cache-tags';
import { TranslationHelperService } from '../translation/translationHelper.service';

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(NewsArticle.name)
    private newsModel: Model<NewsArticleDocument>,
    private frontRevalidate: FrontRevalidateService,
    private translationHelper: TranslationHelperService,
  ) {}

  private translateText(text: { ka: string; en: string } | null | undefined) {
    if (!text) return '';
    let lang: 'ka' | 'en' = 'ka';
    try {
      lang = this.translationHelper.currentLanguage;
    } catch {
      lang = 'ka';
    }
    if (lang === 'ka' && text.ka) return text.ka;
    if (lang === 'en' && text.en) return text.en;
    return text.en || text.ka || '';
  }

  /**
   * Get all news articles with pagination
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: NewsArticleDocument[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.newsModel
          .find()
          .sort({ createdAt: -1 }) // Latest first
          .skip(skip)
          .limit(limit)
          .exec(),
        this.newsModel.countDocuments().exec(),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        page,
        limit,
        total,
        totalPages,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch news articles');
    }
  }

  async findAllPublic(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: {
      _id: string;
      imageUrl: string;
      title: string;
      summary: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const result = await this.findAll(page, limit);
    return {
      ...result,
      data: result.data.map((item) => ({
        _id: (item._id as { toString(): string }).toString(),
        imageUrl: item.imageUrl,
        title: this.translateText(item.title),
        summary: this.translateText(item.summary),
        content: this.translateText(item.content),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  /**
   * Get a single news article by ID
   */
  async findOne(id: string): Promise<NewsArticleDocument> {
    try {
      const news = await this.newsModel.findOne({ _id: id }).exec();

      if (!news) {
        throw new NotFoundException(`News article with ID ${id} not found`);
      }

      return news;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch news article');
    }
  }

  async findOnePublic(id: string): Promise<{
    _id: string;
    imageUrl: string;
    title: string;
    summary: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const news = await this.findOne(id);
    return {
      _id: (news._id as { toString(): string }).toString(),
      imageUrl: news.imageUrl,
      title: this.translateText(news.title),
      summary: this.translateText(news.summary),
      content: this.translateText(news.content),
      createdAt: news.createdAt,
      updatedAt: news.updatedAt,
    };
  }

  /**
   * Create a new news article
   */
  async create(createNewsDto: CreateNewsDto): Promise<NewsArticleDocument> {
    try {
      const news = await this.newsModel.create(createNewsDto);
      void this.frontRevalidate.revalidateTags(FRONT_NEWS_TAGS);
      return news;
    } catch (error) {
      throw new BadRequestException('Failed to create news article');
    }
  }

  /**
   * Update a news article by ID
   */
  async update(
    id: string,
    updateNewsDto: UpdateNewsDto,
  ): Promise<NewsArticleDocument> {
    try {
      const news = await this.newsModel
        .findByIdAndUpdate(id, updateNewsDto, { new: true })
        .exec();

      if (!news) {
        throw new NotFoundException(`News article with ID ${id} not found`);
      }

      void this.frontRevalidate.revalidateTags(FRONT_NEWS_TAGS);
      return news;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update news article');
    }
  }

  /**
   * Delete a news article by ID
   */
  async remove(id: string): Promise<void> {
    try {
      const result = await this.newsModel.findByIdAndDelete(id).exec();

      if (!result) {
        throw new NotFoundException(`News article with ID ${id} not found`);
      }

      void this.frontRevalidate.revalidateTags(FRONT_NEWS_TAGS);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete news article');
    }
  }
}
