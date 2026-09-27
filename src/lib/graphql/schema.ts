import { createSchema } from "graphql-yoga";
import { prisma } from "@/lib/db";

export type GraphQLContext = {
  userId: string | null;
};

const typeDefs = /* GraphQL */ `
  type Review {
    id: ID!
    productId: Int!
    author: String!
    rating: Int!
    comment: String!
    verified: Boolean!
    createdAt: String!
  }

  type Query {
    reviews(productId: Int!): [Review!]!
    averageRating(productId: Int!): Float
  }

  type Mutation {
    addReview(
      productId: Int!
      author: String!
      rating: Int!
      comment: String!
    ): Review!
  }
`;

function toGraphQLReview(review: {
  id: string;
  productId: number;
  author: string;
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: Date;
}) {
  return {
    id: review.id,
    productId: review.productId,
    author: review.author,
    rating: review.rating,
    comment: review.comment,
    verified: review.verified,
    createdAt: review.createdAt.toISOString(),
  };
}

const resolvers = {
  Query: {
    // Only approved reviews are public — pending/rejected ones are only
    // visible through the admin moderation screen.
    reviews: async (_: unknown, args: { productId: number }) => {
      const reviews = await prisma.review.findMany({
        where: { productId: args.productId, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
      });
      return reviews.map(toGraphQLReview);
    },
    // Denormalized on Product, kept in sync when an admin approves a
    // review (see src/app/api/admin/reviews/[id]/route.ts) rather than
    // recomputed from every review on every read.
    averageRating: async (_: unknown, args: { productId: number }) => {
      const product = await prisma.product.findUnique({
        where: { id: args.productId },
      });
      if (!product || product.ratingCount === 0) return null;
      return Number(product.ratingAvg);
    },
  },
  Mutation: {
    addReview: async (
      _: unknown,
      args: {
        productId: number;
        author: string;
        rating: number;
        comment: string;
      },
      context: GraphQLContext
    ) => {
      const rating = Math.min(5, Math.max(1, Math.round(args.rating)));
      const author = args.author.trim() || "Anonim";
      const comment = args.comment.trim();

      // "Verified purchase" — the signed-in reviewer has a delivered order
      // containing this product. Anonymous/guest reviews are never verified.
      let verified = false;
      if (context.userId) {
        const purchase = await prisma.orderItem.findFirst({
          where: {
            productId: args.productId,
            order: { userId: context.userId, status: "TESLIM_EDILDI" },
          },
        });
        verified = !!purchase;
      }

      const review = await prisma.review.create({
        data: {
          productId: args.productId,
          userId: context.userId ?? undefined,
          author,
          rating,
          comment,
          verified,
          status: "PENDING",
        },
      });

      return toGraphQLReview(review);
    },
  },
};

export const schema = createSchema<GraphQLContext>({ typeDefs, resolvers });
