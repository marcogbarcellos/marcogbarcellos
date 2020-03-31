import React, { useEffect, useState, PureComponent } from 'react';
import AppAppBar from '../../components/AppAppBar';
import LoadingPage from '../../common/pages/loading/LoadingPage';
import { orderBy, xor } from 'lodash';
import moment from 'moment';
import { makeStyles } from '@material-ui/styles';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Grid, Typography, TextField, MenuItem, Select, InputLabel, FormControl } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import CountryLineChart from './views/CountryLineChart';
import CountryBarChart from './views/CountryBarChart';
import CountryAreaChart from './views/CountryAreaChart';

const useStyles = makeStyles(theme => ({
  table: {
    minWidth: 650,
  },
  tableRow: {
    cursor: 'pointer',
  },
  categoriesSelect: {
    width: '100%',
    maxWidth: 500,
    marginBottom: theme.spacing(2),
  },
  categoryChip: {
    backgroundColor: '#efefef',
    color: 'black',
    margin: theme.spacing(0.5),
  },
  filters: {
    marginTop: theme.spacing(2),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 180,
  },
}));

const CHART_TYPES = {
  AREA: 'Area Charts',
  BAR: 'Bar Charts',
  LINE: 'Line Charts',
};

function Countries({ history, match }) {
  const classes = useStyles();
  const [cases, setCases] = useState({});
  const [deaths, setDeaths] = useState({});
  const [countries, setCountries] = useState({});
  const [selectedCountries, setSelectCountries] = useState([]);
  const [chartType, setChartType] = React.useState('AREA');

  const handleChangeChartType = event => {
    setChartType(event.target.value);
  };

  const updateData = country => {
    if (!selectedCountries.includes(country.name)) {
      setSelectCountries([...selectedCountries, country.name]);
    }
    const addNewItems = (data, originalItems, valueField, limitValue) => {
      if (data[valueField] && data[valueField] <= limitValue) {
        return;
      }
      if (!originalItems[data.date]) {
        originalItems[data.date] = { date: moment(data.date), updateAt: moment(data.date).format('MMM-DD') };
      }
      originalItems[data.date] = {
        ...originalItems[data.date],
        [country.name]: data[valueField],
      };
    };
    const newCases = { ...cases };
    const newDeaths = { ...deaths };
    for (const dayData of country.timeline) {
      addNewItems(dayData, newCases, 'confirmed', 20);
      addNewItems(dayData, newDeaths, 'deaths', 1);
    }
    setCases(newCases);
    setDeaths(newDeaths);
  };

  useEffect(() => {
    const { params } = match;
    fetch('https://corona-api.com/countries')
      .then(response => {
        return response.json();
      })
      .then(json => {
        const countries = json && json.data;
        if (countries) {
          const newCountries = {};
          for (const country of countries) {
            if (!newCountries[country.name]) {
              newCountries[country.name] = {
                name: country.name,
                code: country.code,
                url: `https://www.countryflags.io/${country.code}/shiny/32.png`,
              };
            }
          }
          setCountries(newCountries);
          if (params && params.countryCode) {
            updateCountryByCode(params.countryCode);
          }
        }
      });
  }, []);

  const updateCountryByCode = code => {
    fetch(`https://corona-api.com/countries/${code}`)
      .then(response => {
        return response.json();
      })
      .then(json => {
        const country = json && json.data;
        if (country) {
          updateData(country);
        }
      });
  };

  const handleChangeCountries = (e, newCountries) => {
    setSelectCountries(newCountries);
    const newCountry = xor(newCountries, selectedCountries) && xor(newCountries, selectedCountries)[0];
    if (newCountry) {
      updateCountryByCode(countries[newCountry].code);
    }
  };

  if (!cases || !deaths) return <LoadingPage />;

  const orderedCases = orderBy(
    Object.values(cases).filter(item => {
      const { date, updateAt, ...rest } = item;
      return Object.values(rest).filter(v => v > 0).length === selectedCountries.length;
    }),
    'date',
    'asc'
  );
  const orderedDeaths = orderBy(
    Object.values(deaths).filter(item => {
      const { date, updateAt, ...rest } = item;
      return Object.values(rest).filter(v => v > 0).length === selectedCountries.length;
    }),
    'date',
    'asc'
  );

  return (
    <>
      <AppAppBar history={history} />
      <Grid container spacing={5} justify="center" alignItems="center">
        <Grid item xs={12} className={classes.filters} container justify="center" alignItems="center">
          <Grid item xs={6} container justify="center" alignItems="center">
            <Autocomplete
              multiple
              className={classes.categoriesSelect}
              ChipProps={{ classes: { root: classes.categoryChip } }}
              id="filter-categories"
              options={Object.values(countries).map(({ name }) => name)}
              value={selectedCountries}
              onChange={handleChangeCountries}
              renderInput={params => (
                <TextField {...params} variant="standard" label="Countries" placeholder="select more countries" />
              )}
              renderOption={option => (
                <Grid spacing={2} container justify="flex-start" alignItems="center">
                  <Grid item>
                    <img alt="sd" src={countries[option].url} />
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">{option}</Typography>
                  </Grid>
                </Grid>
              )}
            />
          </Grid>
          <Grid item xs={6} container justify="center" alignItems="center">
            <FormControl className={classes.formControl}>
              <InputLabel id="simple-select-chart">Chart type</InputLabel>
              <Select labelId="select-chart" id="select-chart" value={chartType} onChange={handleChangeChartType}>
                {Object.entries(CHART_TYPES).map(([value, label]) => (
                  <MenuItem value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Grid item container xs={12} spacing={5} alignItems="center" justify="center">
          {chartType === 'LINE' && (
            <>
              <CountryLineChart title="Number of Cases" data={orderedCases} names={selectedCountries} />
              <CountryLineChart title="Number of Deaths" data={orderedDeaths} names={selectedCountries} />
            </>
          )}
          {chartType === 'BAR' && (
            <>
              <CountryBarChart title="Number of Cases" data={orderedCases} names={selectedCountries} />
              <CountryBarChart title="Number of Deaths" data={orderedDeaths} names={selectedCountries} />
            </>
          )}
          {chartType === 'AREA' && (
            <>
              <CountryAreaChart title="Number of Cases" data={orderedCases} names={selectedCountries} />
              <CountryAreaChart title="Number of Deaths" data={orderedDeaths} names={selectedCountries} />
            </>
          )}
        </Grid>
      </Grid>
    </>
  );
}

export default Countries;