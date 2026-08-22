"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"

type SignedPhoto = { url: string; mime: string | null }

export function JobPhotoGallery({
  attachments,
}: {
  attachments: Array<{ id: string; mime: string | null }>
}) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
        Photos
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {attachments.map((item) => (
          <SignedPhoto key={item.id} id={item.id} />
        ))}
      </div>
    </section>
  )
}

function SignedPhoto({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["attachment", id],
    queryFn: () => apiFetch<SignedPhoto>(`/api/v1/attachments/${id}`),
    staleTime: 45 * 60 * 1000,
  })

  if (query.isLoading) {
    return (
      <div className="aspect-[4/3] animate-pulse rounded-[6px] border border-border bg-surface" />
    )
  }

  if (query.isError || !query.data) {
    return (
      <p className="rounded-[6px] border border-border px-3 py-6 text-center text-xs text-text-muted">
        Photo unavailable
      </p>
    )
  }

  return (
    <a href={query.data.url} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={query.data.url}
        alt="Job completion photo"
        className="aspect-[4/3] w-full rounded-[6px] border border-border object-cover"
      />
    </a>
  )
}
