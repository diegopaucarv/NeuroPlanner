import React from "react";
import { ToggleTabs } from "./ToogleTabs";
import { TabDefinition } from "../lib/viewRegistry";

interface DaySelectorProps {
  tabs: TabDefinition[];
  activeView: string;
  onPress: (target: string) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({
  tabs,
  activeView,
  onPress,
}) => <ToggleTabs tabs={tabs} activeView={activeView} onPress={onPress} />;

export default DaySelector;
