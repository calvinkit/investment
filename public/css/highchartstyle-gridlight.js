/**
 * Grid-light theme for Highcharts JS
 * @author Torstein Honsi
 */

Highcharts.theme = {
	//colors: ["#7cb5ec", "#f7a35c", "#90ee7e", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee", "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
    colors: ["#2b908f", "#90ee70", "#f45b5b", "#7798BF", "#7541b4", "#ff0066", "#eeaaee", "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
	chart: {
		backgroundColor: null,
		style: {
			fontFamily: "Dosis, sans-serif"
		},
        plotBorderColor: '#dddddd',
        plotBorderWidth: 1,
        borderWidth: 1,
        borderColor: '#badcf9'
	},
	title: {
		style: {
			fontSize: '16px',
			fontWeight: 'bold',
			//textTransform: 'uppercase'
		}
	},
    subtitle: {
        style: {
            color: '#E0E0E3'
        }
    },
	xAxis: {
		gridLineWidth: 0,
		labels: {
			style: {
				fontSize: '12px'
			}
		}
	},
	yAxis: {
		gridLineWidth: 1,
		title: {
			style: {
				//textTransform: 'uppercase'
			}
		},
		labels: {
			style: {
				fontSize: '12px'
			}
		}
	},
	tooltip: {
		borderWidth: 0,
		backgroundColor: 'rgba(219,219,216,0.8)',
		shadow: true
	},
	legend: {
		itemStyle: {
			fontWeight: 'bold',
			fontSize: '13px'
		}
	},
	plotOptions: {
		candlestick: {
			lineColor: '#404048'
		},
        series: {
           dataLabels: {
              color: '#B0B0B3'
           },
           marker: {
              lineColor: '#333'
           }
        },
        boxplot: {
           fillColor: '#505053'
        },
        errorbar: {
           color: 'white'
        }
	},
    credits: {
        text: 'www.highcharts.com',
        href: 'http://highcharts.com'
    },


	// General
	background2: '#F0F0EA'
	
};

// Apply the theme
Highcharts.setOptions(Highcharts.theme);
