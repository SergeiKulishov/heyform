import FormAnalyticsFunnel from './Funnel'
import FormAnalyticsOverview from './Overview'
import FormAnalyticsReport from './Report'

export default function FormAnalytics() {
  return (
    <>
      <FormAnalyticsOverview />
      <FormAnalyticsFunnel />
      <FormAnalyticsReport />
    </>
  )
}
