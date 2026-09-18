import { StationWithDistance } from "@/types";

export type RootStackParamList = {
  StationList: undefined;
  StationDetail: { station: StationWithDistance };
};
