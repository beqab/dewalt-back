import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductsService } from './products.service';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Brand } from '../categories/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { ChildCategory } from '../categories/entities/child-category.entity';
import { faker } from '@faker-js/faker';

// Generate random image URLs using Picsum Photos (reliable placeholder service)
// Using random IDs to get different images each time
function getRandomImages(count: number = 5): string[] {
  const images: string[] = [];
  const usedIds = new Set<number>();

  for (let i = 0; i < count; i++) {
    let imageId: number;
    do {
      // Generate random ID between 1 and 1000
      imageId = faker.number.int({ min: 1, max: 1000 });
    } while (usedIds.has(imageId));

    usedIds.add(imageId);
    images.push(`https://picsum.photos/id/${imageId}/800/600`);
  }

  return images;
}

function generateFakeProduct(index: number) {
  const productName = faker.commerce.productName();
  const price = parseFloat(faker.commerce.price({ min: 50, max: 1000 }));
  const originalPrice = faker.datatype.boolean({ probability: 0.7 })
    ? price + parseFloat(faker.commerce.price({ min: 50, max: 300 }))
    : undefined;
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : undefined;
  const imageCount = faker.number.int({ min: 2, max: 6 });
  const images = getRandomImages(imageCount);
  const inStock = faker.datatype.boolean({ probability: 0.85 });
  const quantity = inStock ? faker.number.int({ min: 0, max: 200 }) : 0;

  // Generate specs
  const specCount = faker.number.int({ min: 2, max: 5 });
  const specs = Array.from({ length: specCount }, () => {
    const specLabel = faker.commerce.productAdjective();
    const specValue = faker.commerce.productMaterial();
    return {
      label: {
        en: specLabel,
        ka: `${specLabel} (KA)`,
      },
      value: {
        en: specValue,
        ka: `${specValue} (KA)`,
      },
    };
  });

  return {
    name: {
      en: `DEWALT ${productName}`,
      ka: `DEWALT ${productName} (KA)`,
    },
    code: `DEW-${faker.string.alphanumeric(8).toUpperCase()}`,
    description: {
      en: faker.commerce.productDescription(),
      ka: `${faker.commerce.productDescription()} (KA)`,
    },
    image: images[0],
    images: images.slice(1), // Additional images (excluding the main one)
    price: Math.round(price * 100) / 100,
    originalPrice: originalPrice
      ? Math.round(originalPrice * 100) / 100
      : undefined,
    discount,
    inStock,
    quantity,
    rating: parseFloat(
      faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }).toFixed(1),
    ),
    reviewCount: faker.number.int({ min: 10, max: 500 }),
    slug: faker.helpers.slugify(productName).toLowerCase(),
    specs,
  };
}

const fakeProducts = [
  {
    name: {
      en: 'DEWALT DCD791D2 20V MAX XR Cordless Drill Driver Kit',
      ka: 'DEWALT DCD791D2 20V MAX XR უსადენო საბურღი კომპლექტი',
    },
    code: 'DEW-DCD791D2',
    description: {
      en: 'Powerful cordless drill driver with brushless motor, 2-speed transmission, and LED light. Includes 2 batteries and charger.',
      ka: 'ძლიერი უსადენო საბურღი უბრაშის ძრავით, 2-სიჩქარიანი გადაცემით და LED განათებით. მოიცავს 2 ბატარეას და დამტენს.',
    },
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
    ],
    price: 199.99,
    originalPrice: 249.99,
    discount: 20,
    inStock: true,
    quantity: 45,
    rating: 4.5,
    reviewCount: 127,
    slug: 'dewalt-dcd791d2-20v-max-xr-cordless-drill-driver-kit',
    specs: [
      {
        label: { en: 'Voltage', ka: 'ვოლტაჟი' },
        value: { en: '20V MAX', ka: '20V MAX' },
      },
      {
        label: { en: 'Battery Type', ka: 'ბატარეის ტიპი' },
        value: { en: 'Lithium Ion', ka: 'ლითიუმ-იონური' },
      },
      {
        label: { en: 'Chuck Size', ka: 'ჩაკის ზომა' },
        value: { en: '1/2 inch', ka: '1/2 ინჩი' },
      },
    ],
  },
  {
    name: {
      en: 'DEWALT DWS779 12-Inch Miter Saw',
      ka: 'DEWALT DWS779 12-ინჩიანი მიტერის ხერხი',
    },
    code: 'DEW-DWS779',
    description: {
      en: 'Professional miter saw with 15-amp motor, 0-50 degree miter capacity, and 0-48 degree bevel capacity.',
      ka: 'პროფესიონალური მიტერის ხერხი 15-ამპერიანი ძრავით, 0-50 გრადუსიანი მიტერის ტევადობით და 0-48 გრადუსიანი ფერდობის ტევადობით.',
    },
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
    ],
    price: 399.99,
    originalPrice: 449.99,
    discount: 11,
    inStock: true,
    quantity: 23,
    rating: 4.7,
    reviewCount: 89,
    slug: 'dewalt-dws779-12-inch-miter-saw',
    specs: [
      {
        label: { en: 'Motor', ka: 'ძრავა' },
        value: { en: '15 Amp', ka: '15 ამპერი' },
      },
      {
        label: { en: 'Blade Size', ka: 'დანის ზომა' },
        value: { en: '12 inch', ka: '12 ინჩი' },
      },
      {
        label: { en: 'Miter Range', ka: 'მიტერის დიაპაზონი' },
        value: { en: '0-50°', ka: '0-50°' },
      },
    ],
  },
  {
    name: {
      en: 'DEWALT DWE7491RS 10-Inch Table Saw',
      ka: 'DEWALT DWE7491RS 10-ინჩიანი მაგიდის ხერხი',
    },
    code: 'DEW-DWE7491RS',
    description: {
      en: 'Jobsite table saw with rolling stand, 15-amp motor, and 32.5-inch rip capacity.',
      ka: 'სამუშაო ადგილის მაგიდის ხერხი მოძრავი სადგამით, 15-ამპერიანი ძრავით და 32.5-ინჩიანი ჭრის ტევადობით.',
    },
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    ],
    price: 599.99,
    originalPrice: 699.99,
    discount: 14,
    inStock: true,
    quantity: 15,
    rating: 4.6,
    reviewCount: 203,
    slug: 'dewalt-dwe7491rs-10-inch-table-saw',
    specs: [
      {
        label: { en: 'Motor', ka: 'ძრავა' },
        value: { en: '15 Amp', ka: '15 ამპერი' },
      },
      {
        label: { en: 'Blade Size', ka: 'დანის ზომა' },
        value: { en: '10 inch', ka: '10 ინჩი' },
      },
      {
        label: { en: 'Rip Capacity', ka: 'ჭრის ტევადობა' },
        value: { en: '32.5 inch', ka: '32.5 ინჩი' },
      },
    ],
  },
  {
    name: {
      en: 'DEWALT DCF887B 20V MAX XR Impact Driver',
      ka: 'DEWALT DCF887B 20V MAX XR იმპაქტური დრაივერი',
    },
    code: 'DEW-DCF887B',
    description: {
      en: 'Brushless impact driver with 3-speed settings, 1,825 in-lbs of torque, and compact design.',
      ka: 'უბრაშის იმპაქტური დრაივერი 3-სიჩქარიანი რეჟიმებით, 1,825 in-lbs ბრუნვის მომენტით და კომპაქტური დიზაინით.',
    },
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    images: [],
    price: 149.99,
    originalPrice: 179.99,
    discount: 17,
    inStock: true,
    quantity: 67,
    rating: 4.8,
    reviewCount: 312,
    slug: 'dewalt-dcf887b-20v-max-xr-impact-driver',
    specs: [
      {
        label: { en: 'Voltage', ka: 'ვოლტაჟი' },
        value: { en: '20V MAX', ka: '20V MAX' },
      },
      {
        label: { en: 'Torque', ka: 'ბრუნვის მომენტი' },
        value: { en: '1,825 in-lbs', ka: '1,825 in-lbs' },
      },
      {
        label: { en: 'Speed Settings', ka: 'სიჩქარის რეჟიმები' },
        value: { en: '3', ka: '3' },
      },
    ],
  },
  {
    name: {
      en: 'DEWALT DCS570B 20V MAX XR Circular Saw',
      ka: 'DEWALT DCS570B 20V MAX XR წრიული ხერხი',
    },
    code: 'DEW-DCS570B',
    description: {
      en: 'Cordless circular saw with brushless motor, 7-1/4 inch blade, and bevel capacity up to 57 degrees.',
      ka: 'უსადენო წრიული ხერხი უბრაშის ძრავით, 7-1/4 ინჩიანი დანით და 57 გრადუსამდე ფერდობის ტევადობით.',
    },
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
    ],
    price: 179.99,
    inStock: true,
    quantity: 34,
    rating: 4.4,
    reviewCount: 156,
    slug: 'dewalt-dcs570b-20v-max-xr-circular-saw',
    specs: [
      {
        label: { en: 'Voltage', ka: 'ვოლტაჟი' },
        value: { en: '20V MAX', ka: '20V MAX' },
      },
      {
        label: { en: 'Blade Size', ka: 'დანის ზომა' },
        value: { en: '7-1/4 inch', ka: '7-1/4 ინჩი' },
      },
      {
        label: { en: 'Bevel Capacity', ka: 'ფერდობის ტევადობა' },
        value: { en: 'Up to 57°', ka: '57°-მდე' },
      },
    ],
  },
  {
    name: {
      en: 'DEWALT DWE6423K Random Orbital Sander',
      ka: 'DEWALT DWE6423K შემთხვევითი ორბიტალური ქვიშის ქაღალდი',
    },
    code: 'DEW-DWE6423K',
    description: {
      en: '5-inch random orbital sander with 3.0 amp motor and variable speed control.',
      ka: '5-ინჩიანი შემთხვევითი ორბიტალური ქვიშის ქაღალდი 3.0 ამპერიანი ძრავით და ცვლადი სიჩქარის კონტროლით.',
    },
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    images: [],
    price: 89.99,
    originalPrice: 109.99,
    discount: 18,
    inStock: true,
    quantity: 52,
    rating: 4.3,
    reviewCount: 78,
    slug: 'dewalt-dwe6423k-random-orbital-sander',
    specs: [
      {
        label: { en: 'Motor', ka: 'ძრავა' },
        value: { en: '3.0 Amp', ka: '3.0 ამპერი' },
      },
      {
        label: { en: 'Pad Size', ka: 'პადის ზომა' },
        value: { en: '5 inch', ka: '5 ინჩი' },
      },
      {
        label: { en: 'Orbits per Minute', ka: 'ორბიტები წუთში' },
        value: { en: '12,000', ka: '12,000' },
      },
    ],
  },
  {
    name: {
      en: 'DEWALT DCS391B 20V MAX XR Jigsaw',
      ka: 'DEWALT DCS391B 20V MAX XR ჯიგსოუ',
    },
    code: 'DEW-DCS391B',
    description: {
      en: 'Cordless jigsaw with brushless motor, variable speed trigger, and tool-free blade change.',
      ka: 'უსადენო ჯიგსოუ უბრაშის ძრავით, ცვლადი სიჩქარის ტრიგერით და ხელსაწყოს გარეშე დანის შეცვლით.',
    },
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    ],
    price: 129.99,
    inStock: false,
    quantity: 0,
    rating: 4.2,
    reviewCount: 94,
    slug: 'dewalt-dcs391b-20v-max-xr-jigsaw',
    specs: [
      {
        label: { en: 'Voltage', ka: 'ვოლტაჟი' },
        value: { en: '20V MAX', ka: '20V MAX' },
      },
      {
        label: { en: 'Stroke Length', ka: 'დარტყმის სიგრძე' },
        value: { en: '1 inch', ka: '1 ინჩი' },
      },
      {
        label: { en: 'Speed', ka: 'სიჩქარე' },
        value: { en: '0-3,000 SPM', ka: '0-3,000 SPM' },
      },
    ],
  },
  {
    name: {
      en: 'DEWALT DCL050 20V MAX LED Work Light',
      ka: 'DEWALT DCL050 20V MAX LED სამუშაო ნათება',
    },
    code: 'DEW-DCL050',
    description: {
      en: 'Bright LED work light with 20V MAX battery compatibility, 2,100 lumens, and 360-degree rotation.',
      ka: 'ნათელი LED სამუშაო ნათება 20V MAX ბატარეის თავსებადობით, 2,100 ლუმენით და 360 გრადუსიანი ბრუნვით.',
    },
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    images: [],
    price: 49.99,
    originalPrice: 59.99,
    discount: 17,
    inStock: true,
    quantity: 128,
    rating: 4.6,
    reviewCount: 245,
    slug: 'dewalt-dcl050-20v-max-led-work-light',
    specs: [
      {
        label: { en: 'Voltage', ka: 'ვოლტაჟი' },
        value: { en: '20V MAX', ka: '20V MAX' },
      },
      {
        label: { en: 'Brightness', ka: 'სიკაშკაშე' },
        value: { en: '2,100 lumens', ka: '2,100 ლუმენი' },
      },
      {
        label: { en: 'Runtime', ka: 'მუშაობის დრო' },
        value: { en: 'Up to 11 hours', ka: '11 საათამდე' },
      },
    ],
  },
];

async function seedProducts() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productsService = app.get(ProductsService);
  const brandModel = app.get<Model<Brand>>(getModelToken(Brand.name));
  const categoryModel = app.get<Model<Category>>(getModelToken(Category.name));
  const childCategoryModel = app.get<Model<ChildCategory>>(
    getModelToken(ChildCategory.name),
  );

  try {
    // Get first brand, category, and child category
    const brands = await brandModel.find().limit(1).exec();
    const categories = await categoryModel.find().limit(1).exec();
    const childCategories = await childCategoryModel.find().limit(1).exec();

    if (brands.length === 0) {
      console.error('No brands found. Please create a brand first.');
      await app.close();
      return;
    }

    if (categories.length === 0) {
      console.error('No categories found. Please create a category first.');
      await app.close();
      return;
    }

    const brandId = brands[0]._id.toString();
    const categoryId = categories[0]._id.toString();
    const childCategoryId =
      childCategories.length > 0
        ? childCategories[0]._id.toString()
        : undefined;

    // Generate fake products using faker
    const productCount = 20; // Generate 20 fake products
    const generatedProducts = Array.from({ length: productCount }, (_, i) =>
      generateFakeProduct(i),
    );

    // Combine predefined products with generated ones
    const allProducts = [...generatedProducts];

    console.log(`Seeding ${allProducts.length} products...`);

    for (const productData of allProducts) {
      try {
        const product = await productsService.create({
          ...productData,
          brandId,
          categoryId,
          childCategoryId,
        });
        console.log(`✓ Created product: ${product.name.en}`);
      } catch (error) {
        console.error(
          `✗ Failed to create product ${productData.name.en}:`,
          (error as Error).message,
        );
      }
    }

    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await app.close();
  }
}

void seedProducts();
