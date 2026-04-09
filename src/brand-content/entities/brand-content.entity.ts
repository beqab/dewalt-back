import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

type LocalizedText = { ka: string; en: string };

const localized = (ka: string, en: string): LocalizedText => ({ ka, en });

const dewaltDefaults = {
  cardDescription: localized(
    'DEWALT უკვე საუკუნეა პროფესიონალების ნდობას იმსახურებს გამძლე და ძლიერი ხელსაწყოებით.',
    "DEWALT has earned professionals' trust for over a century with durable, high-performance tools.",
  ),
  aboutContent: localized(
    '<p>DEWALT დაარსდა 1924 წელს რეიმონდ დევოლტის მიერ და უკვე საუკუნეა პროფესიონალების ნდობას იმსახურებს. ბრენდის გზა დაიწყო რეგულირებადი რადიალური მკლავიანი ხერხის, „Wonder-Worker“-ის, გამოგონებით, რომელმაც სამუშაო ადგილზე პროდუქტიულობა მნიშვნელოვნად გაზარდა.</p>',
    "<p>DEWALT was founded in 1924 by Raymond DeWalt and has been trusted by professionals for a century. The brand's story began with the invention of the adjustable radial arm saw, the 'Wonder-Worker,' which significantly improved jobsite productivity.</p>",
  ),
};

const stanleyDefaults = {
  cardDescription: localized(
    'Stanley ხელის ინსტრუმენტების სფეროში ისტორიული ბრენდია, რომელიც ხარისხსა და პრაქტიკულობას აერთიანებს.',
    'Stanley is a heritage hand-tools brand known for combining quality, reliability, and practicality.',
  ),
  aboutContent: localized(
    '<p>Stanley Tools ხელის ინსტრუმენტების ინდუსტრიის ერთ-ერთი ყველაზე ცნობილი ბრენდია, რომლის ისტორია 1843 წლიდან იწყება. ფრედერიკ ტ. სტენლის მიერ დაარსებული კომპანია უკვე 180 წელზე მეტია ინოვაციების ერთ-ერთი წამყვანი ძალაა სფეროში.</p>',
    '<p>Stanley Tools is one of the most recognized brands in the hand tools industry, with a history dating back to 1843. Founded by Frederick T. Stanley, the company has remained a major force in tool innovation for more than 180 years.</p>',
  ),
};

const blackDeckerDefaults = {
  cardDescription: localized(
    'Black & Decker გლობალური ბრენდია ყოველდღიური სამუშაოებისთვის, სახლისთვის და გარე სივრცისთვის.',
    'Black & Decker is a global brand built for everyday jobs, home use, and outdoor projects.',
  ),
  aboutContent: localized(
    '<p>BLACK+DECKER, დაარსებული 1910 წელს, უკვე 110 წელზე მეტია ინოვაციების ლიდერია ელექტროინსტრუმენტებში, სახლის პროდუქტებსა და გარე მოწყობილობებში. ბრენდის ბურღი ერთ-ერთ ადრეულ მთვარის მისიაშიც კი გამოიყენეს.</p>',
    '<p>BLACK+DECKER, founded in 1910, has been a leader in innovation for over 110 years across power tools, home products, and outdoor equipment. Its drill was even used in an early mission to the moon.</p>',
  ),
};

@Schema({ _id: false })
export class BrandTextBlock {
  @Prop({ type: { ka: String, en: String }, default: () => localized('', '') })
  cardDescription: LocalizedText;

  @Prop({ type: { ka: String, en: String }, default: () => localized('', '') })
  aboutContent: LocalizedText;
}

const BrandTextBlockSchema = SchemaFactory.createForClass(BrandTextBlock);

@Schema({ timestamps: true })
export class BrandContent {
  @Prop({ type: String, required: true, unique: true, default: 'main' })
  key: 'main';

  @Prop({ type: BrandTextBlockSchema, default: () => dewaltDefaults })
  dewalt: BrandTextBlock;

  @Prop({ type: BrandTextBlockSchema, default: () => stanleyDefaults })
  stanley: BrandTextBlock;

  @Prop({ type: BrandTextBlockSchema, default: () => blackDeckerDefaults })
  blackDecker: BrandTextBlock;
}

export const BrandContentSchema = SchemaFactory.createForClass(BrandContent);
export type BrandContentDocument = BrandContent & Document;
