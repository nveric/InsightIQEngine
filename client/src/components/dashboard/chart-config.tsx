
import { useState } from 'react';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ChartConfigProps {
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
}

export function ChartConfigPanel({ config, onChange }: ChartConfigProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleChange = (key: keyof ChartConfig, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Chart Configuration</SheetTitle>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-legend">Show Legend</Label>
            <Switch
              id="show-legend"
              checked={localConfig.showLegend}
              onCheckedChange={(checked) => handleChange('showLegend', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-grid">Show Grid</Label>
            <Switch
              id="show-grid"
              checked={localConfig.showGrid}
              onCheckedChange={(checked) => handleChange('showGrid', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="smooth">Smooth Lines</Label>
            <Switch
              id="smooth"
              checked={localConfig.smooth}
              onCheckedChange={(checked) => handleChange('smooth', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="animation">Enable Animation</Label>
            <Switch
              id="animation"
              checked={localConfig.animation}
              onCheckedChange={(checked) => handleChange('animation', checked)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
