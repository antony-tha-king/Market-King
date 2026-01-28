"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTimezones, formatCurrentDateTime } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TimezoneSelector() {
  const [allTimezones] = useState<string[]>(getTimezones());
  const [filteredTimezones, setFilteredTimezones] = useState<string[]>(allTimezones);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(formatCurrentDateTime(selectedTimezone));
    };
    updateTime(); // Initial update
    const intervalId = setInterval(updateTime, 1000); // Update every second
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [selectedTimezone]);

  useEffect(() => {
    if (searchQuery === '') {
      setFilteredTimezones(allTimezones);
    } else {
      setFilteredTimezones(
        allTimezones.filter(tz => tz.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  }, [searchQuery, allTimezones]);
  
  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
  };

  const dateTimeParts = currentDateTime.split(', ');
  const datePart = dateTimeParts.slice(0, -1).join(', ');
  const timePart = dateTimeParts.slice(-1)[0];


  return (
    <Card className="shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Timezone Information</CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          type="text"
          placeholder="Search for a time zone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />
        <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
          <SelectTrigger className="w-full mb-4">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[200px]">
              {filteredTimezones.length > 0 ? (
                filteredTimezones.map(tz => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">No timezones found.</div>
              )}
            </ScrollArea>
          </SelectContent>
        </Select>
        {currentDateTime && (
           <div className="text-center p-4 bg-primary/10 rounded-lg">
             <p className="text-sm text-muted-foreground">Current Date and Time in {selectedTimezone}:</p>
             <p className="text-lg font-semibold text-primary">{datePart}</p>
             <p className="text-2xl font-bold text-primary">{timePart}</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
