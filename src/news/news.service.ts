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

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(NewsArticle.name)
    private newsModel: Model<NewsArticleDocument>,
  ) {}

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

  /**
   * Create a new news article
   */
  async create(createNewsDto: CreateNewsDto): Promise<NewsArticleDocument> {
    try {
      const news = await this.newsModel.create(createNewsDto);
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete news article');
    }
  }
}
