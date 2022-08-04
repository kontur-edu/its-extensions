import React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

export interface ISimpleSelectItem {
  id: any;
  name: string;
}

export interface ISimpleSelectProps {
  label: string;
  items: ISimpleSelectItem[];
  selectedId: any | null;
  onChange: (event: SelectChangeEvent) => void;
}

export function SimpleSelect(props: ISimpleSelectProps) {
  return (
    <FormControl style={{ minWidth: 120, margin: '1em', display: 'inline-block' }}>
      <InputLabel id="competition-group-preparation-select">
        {props.label}
      </InputLabel>
      {props.selectedId !== null && (
        <Select
          labelId="competition-group-preparation-select"
          value={`${props.selectedId}`}
          label="Конкурсная группа"
          onChange={props.onChange}
        >
          {props.items.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </Select>
      )}
    </FormControl>
  );
}
