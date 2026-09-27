"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "urql";
import { PillButton } from "@/components/Pill";
import { StarRating } from "@/components/StarRating";

const REVIEWS_QUERY = `
  query Reviews($productId: Int!) {
    reviews(productId: $productId) {
      id
      author
      rating
      comment
      verified
      createdAt
    }
    averageRating(productId: $productId)
  }
`;

const ADD_REVIEW_MUTATION = `
  mutation AddReview(
    $productId: Int!
    $author: String!
    $rating: Int!
    $comment: String!
  ) {
    addReview(
      productId: $productId
      author: $author
      rating: $rating
      comment: $comment
    ) {
      id
    }
  }
`;

type ReviewsQueryResult = {
  reviews: {
    id: string;
    author: string;
    rating: number;
    comment: string;
    verified: boolean;
    createdAt: string;
  }[];
  averageRating: number | null;
};

export function ReviewSection({ productId }: { productId: number }) {
  const [{ data, fetching }, reexecuteQuery] = useQuery<ReviewsQueryResult>({
    query: REVIEWS_QUERY,
    variables: { productId },
  });
  const [, addReview] = useMutation(ADD_REVIEW_MUTATION);

  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    await addReview({ productId, author, rating, comment });
    setComment("");
    setAuthor("");
    setRating(5);
    setSubmitting(false);
    setJustSubmitted(true);
    reexecuteQuery({ requestPolicy: "network-only" });
  }

  return (
    <section className="mt-14 border-t border-line pt-10">
      <h2 className="font-display text-2xl">
        Değerlendirmeler
        {data?.averageRating != null && (
          <span className="ml-2 font-sans text-sm text-ink-soft">
            Ortalama {data.averageRating.toFixed(1)} / 5
          </span>
        )}
      </h2>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Adınız (opsiyonel)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="border border-line px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <div className="flex items-center">
          <StarRating rating={rating} onChange={setRating} />
        </div>
        <textarea
          placeholder="Yorumunuz"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          className="sm:col-span-2 border border-line px-3 py-2 text-sm outline-none focus:border-ink"
          rows={3}
        />
        <PillButton type="submit" disabled={submitting} className="sm:col-span-2 w-fit">
          {submitting ? "Gönderiliyor…" : "Yorumu Gönder"}
        </PillButton>
        {justSubmitted && (
          <p className="text-xs text-ink-soft sm:col-span-2">
            Yorumunuz alındı! Onaylandıktan sonra burada görünecek.
          </p>
        )}
      </form>

      <ul className="mt-6 space-y-4">
        {fetching && <p className="text-sm text-ink-soft">Yükleniyor…</p>}
        {data?.reviews.length === 0 && !fetching && (
          <p className="text-sm text-ink-soft">
            Henüz yorum yok. İlk yorumu siz yazın!
          </p>
        )}
        {data?.reviews.map((r) => (
          <li key={r.id} className="border border-line p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                {r.author}
                {r.verified && (
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold uppercase tracking-wide text-primary">
                    Doğrulanmış Alışveriş
                  </span>
                )}
              </span>
              <span className="text-primary">{"★".repeat(r.rating)}</span>
            </div>
            <p className="mt-1 text-sm text-ink">{r.comment}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
