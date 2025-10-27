import LoadingAnimation from '@/components/shared/LoadingAnimation'

export default function Loading() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] bg-background overflow-hidden">
      <LoadingAnimation size={64} color="#3b82f6" />
    </div>
  )
}
