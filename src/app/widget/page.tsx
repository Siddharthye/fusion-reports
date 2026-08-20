import { FusionBoard } from '@/components/FusionBoard'

/**
 * `/widget` — the fusion board alone, no console chrome, for iframes.
 *
 * This is what makes FUSION stack-agnostic: a host application on Flask, Vue,
 * or plain HTML embeds one iframe and gets the live board without running any
 * of our code in their bundle.
 *
 * @example
 * <iframe src="http://localhost:4104/widget"
 *         style="border:0;width:100%;height:640px"></iframe>
 */
export default function WidgetPage() {
  return (
    <main className="p-3">
      <FusionBoard />
    </main>
  )
}
