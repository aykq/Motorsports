const F1_DRIVER_IMAGES: Record<string, string> = {
  max_verstappen: "/f1/drivers/2026redbullracingmaxver01right.webp",
  isack_hadjar:   "/f1/drivers/2026redbullracingisahad01right.webp",
  hadjar:         "/f1/drivers/2026redbullracingisahad01right.webp",
  leclerc:        "/f1/drivers/2026ferrarichalec01right.webp",
  hamilton:       "/f1/drivers/2026ferrarilewham01right.webp",
  russell:        "/f1/drivers/2026mercedesgeorus01right.webp",
  antonelli:      "/f1/drivers/2026mercedesandant01right.webp",
  kimi_antonelli: "/f1/drivers/2026mercedesandant01right.webp",
  norris:         "/f1/drivers/2026mclarenlannor01right.webp",
  piastri:        "/f1/drivers/2026mclarenoscpia01right.webp",
  alonso:         "/f1/drivers/2026astonmartinferalo01right.webp",
  stroll:         "/f1/drivers/2026astonmartinlanstr01right.webp",
  gasly:          "/f1/drivers/2026alpinepiegas01right.webp",
  colapinto:      "/f1/drivers/2026alpinefracol01right.webp",
  ocon:           "/f1/drivers/2026haasf1teamestoco01right.webp",
  bearman:        "/f1/drivers/2026haasf1teamolibea01right.webp",
  oliver_bearman: "/f1/drivers/2026haasf1teamolibea01right.webp",
  albon:          "/f1/drivers/2026williamsalealb01right.webp",
  sainz:          "/f1/drivers/2026williamscarsai01right.webp",
  hulkenberg:     "/f1/drivers/2026audinichul01right.webp",
  bortoleto:      "/f1/drivers/2026audigabbor01right.webp",
  lawson:         "/f1/drivers/2026racingbullslialaw01right.webp",
  liam_lawson:    "/f1/drivers/2026racingbullslialaw01right.webp",
  lindblad:       "/f1/drivers/2026racingbullsarvlin01right.webp",
  arvid_lindblad: "/f1/drivers/2026racingbullsarvlin01right.webp",
  perez:          "/f1/drivers/2026cadillacserper01right.webp",
  bottas:         "/f1/drivers/2026cadillacvalbot01right.webp",
};

export function getF1DriverImage(driverId: string): string | undefined {
  return F1_DRIVER_IMAGES[driverId];
}
