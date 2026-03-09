import { createTRPCRouter } from "@/server/trpc";

import { b2cSiteBrandingRouter } from "./branding";
import { heroSlideRouter } from "./hero-slide";
import { publicPageRouter } from "./public-page";
import { blogPostRouter } from "./blog-post";
import { faqRouter } from "./faq";
import { testimonialRouter } from "./testimonial";
import { newsletterRouter } from "./newsletter";
import { contactInquiryRouter } from "./contact-inquiry";
import { b2cMarkupRouter } from "./b2c-markup";

export const b2cSiteRouter = createTRPCRouter({
  branding: b2cSiteBrandingRouter,
  heroSlide: heroSlideRouter,
  page: publicPageRouter,
  blogPost: blogPostRouter,
  faq: faqRouter,
  testimonial: testimonialRouter,
  newsletter: newsletterRouter,
  contactInquiry: contactInquiryRouter,
  b2cMarkup: b2cMarkupRouter,
});
