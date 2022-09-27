export interface ResponseBody {
  challenge: string
  time: number
  address: string
  signature: string
  fields: { [key: string]: string | number }
  bap?: any
  signed?: any
}
