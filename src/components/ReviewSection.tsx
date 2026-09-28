"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "urql";
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

  const FIELD =
    "w-full border-0 border-b border-line-strong bg-transparent py-3 text-body-lg font-light text-ink outline-none transition-colors placeholder:text-text-4 focus:border-ink";

  return (
    <section className="page-x pt-28">
      <div className="grid grid-cols-12 gap-x-2 gap-y-10">
        <div className="col-span-12 desk:col-span-4">
          <h2 className="text-body-sm uppercase tracking-eyebrow">Değerlendirmeler</h2>
          {data?.averageRating != null && (
            <p className="mt-3 text-card text-text-3">Ortalama {data.averageRating.toFixed(1)} / 5</p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 flex max-w-md flex-col gap-5">
            <input
              aria-label="Adın"
              placeholder="Adın (isteğe bağlı)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={FIELD}
            />
            <div className="flex items-center gap-3 text-card text-text-3">
              Puanın
              <StarRating rating={rating} onChange={setRating} />
            </div>
            <textarea
              aria-label="Yorumun"
              placeholder="Yorumun"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={3}
              className={`${FIELD} resize-none`}
            />
            <button
              type="submit"
              disabled={submitting}
              className="h-12 self-start border border-ink px-11 text-nav uppercase tracking-cta transition-colors hover:bg-ink hover:text-background disabled:opacity-50"
            >
              {submitting ? "Gönderiliyor…" : "Yorumu gönder"}
            </button>
            {justSubmitted && (
              <p className="text-[12px] text-text-3">
                Yorumun alındı. Onaylandıktan sonra burada görünecek.
              </p>
            )}
          </form>
        </div>

        <ul className="col-span-12 border-t border-line desk:col-start-6 desk:col-span-7">
          {fetching && <li className="py-6 text-card text-text-3">Yükleniyor…</li>}
          {data?.reviews.length === 0 && !fetching && (
            <li className="py-6 text-card text-text-3">Henüz yorum yok. İlk yorumu sen yaz.</li>
          )}
          {data?.reviews.map((r) => (
            <li key={r.id} className="border-b border-line py-6">
              <div className="flex items-baseline justify-between gap-4 text-card">
                <span className="flex items-baseline gap-3">
                  {r.author}
                  {r.verified && (
                    <span className="text-caption uppercase tracking-label text-text-3">
                      Doğrulanmış alışveriş
                    </span>
                  )}
                </span>
                <span aria-label={`${r.rating} / 5`} className="tracking-[0.1em]">
                  {"★".repeat(r.rating)}
                  <span className="text-disabled">{"★".repeat(5 - r.rating)}</span>
                </span>
              </div>
              <p className="mt-2 max-w-[60ch] text-body font-light text-ink-soft">{r.comment}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
