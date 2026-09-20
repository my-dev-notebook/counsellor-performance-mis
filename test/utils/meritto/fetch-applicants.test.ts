import { describe, test, expect } from "vitest";
import { fetchApplicants } from "@/utils/meritto/fetch-applicants";

describe("meritto/fetchApplicants", () => {
    test("smoke test", async () => {

        const url = "https://nop4jqg9x3.in1.nopaperforms.io/applications/ajax-lists"

        const headers = {
            "accept": 'text/html, */*; q=0.01',
            "accept-language": 'en-US,en;q=0.9',
            "content-type": 'application/x-www-form-urlencoded; charset=UTF-8',
            "cookie": 'csrfToken=f67e663663e0381be075837e4299747e4a4c9d16; _gcl_au=1.1.226011824.1788956310; _ga=GA1.2.1145941116.1788956310; _ga=GA1.4.1145941116.1788956310; npfwg=1; npf_r=; npf_l=nop4jqg9x3.in1.nopaperforms.io; npf_u=https://nop4jqg9x3.in1.nopaperforms.io/counsellors/dashboard; NPFSSID=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjE2MDYzMjQ0LCJ1dHlwZSI6Imluc3RpdHV0ZSIsImNpZCI6MjU3LCJleHAiOjE3ODk5MzE2ODAsInVzaWQiOiJlYmE3NWQwYmNkNDc0NWQ5YWI4MDgzYjhhNDkzNDU4OSJ9.PJTS6QM5-jeYzw3_bR-zw-0AJDS9-6GGNy0mSWiqQWk; UserGroup=Q2FrZQ%3D%3D.NGIxZjJmM2YyZGZiM2ZkMGIyNzk2YjRlYTcxMDZmYTljM2ExOTA3ODBjMzRjMWMyMjRiZWRkMWM3ZTZmYzhkNMZEq3TJrPOwO0PgapTSHMHtnMvwxKraH2hRAlxuoRyW; _clck=tqbyg%5E2%5Eg9m%5E0%5E2443; _gid=GA1.2.1448399879.1789895681; _gid=GA1.4.1448399879.1789895681; hsclg=257; _ga_S234BK01XY=GS2.2.s1789895680$o4$g1$t1789895695$j45$l0$h0; _ga_N5TPBCT4KM=GS2.4.s1789895680$o4$g1$t1789895695$j45$l0$h0; _clsk=fhf91k%5E1789895695274%5E2%5E1%5En.clarity.ms%2Fcollect; AWSALB=cATkefIm/3D+A7ZljArf50cA6Moy+DEptoSo5rIn2AvT1onCPsBwBrTV4XXmeufp2tV0z6868jga614MFKxUVEg105mp/4ePwYders49nFB6jr4sxcLGJqk29PzC; AWSALBCORS=cATkefIm/3D+A7ZljArf50cA6Moy+DEptoSo5rIn2AvT1onCPsBwBrTV4XXmeufp2tV0z6868jga614MFKxUVEg105mp/4ePwYders49nFB6jr4sxcLGJqk29PzC; AMP_95bf0ea3fa=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJhM2U5NzMzOC01ZmUyLTRkMTQtYjIwOC05MDVhOTIzZWI3NWYlMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjIxNjA2MzI0NCUyMiUyQyUyMnNlc3Npb25JZCUyMiUzQTE3ODk4OTU2ODA2MTIlMkMlMjJvcHRPdXQlMjIlM0FmYWxzZSUyQyUyMmxhc3RFdmVudFRpbWUlMjIlM0ExNzg5ODk1ODQwMzAyJTJDJTIybGFzdEV2ZW50SWQlMjIlM0EzODUlMkMlMjJwYWdlQ291bnRlciUyMiUzQTAlMkMlMjJjb29raWVEb21haW4lMjIlM0ElMjIubm9wYXBlcmZvcm1zLmlvJTIyJTdE',
            "origin": 'https://nop4jqg9x3.in1.nopaperforms.io',
            "priority": 'u=1, i',
            "referer": 'https://nop4jqg9x3.in1.nopaperforms.io/applications/application-manager',
            "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
            "sec-ch-ua-mobile": '?0',
            "sec-ch-ua-platform": '"Linux"',
            "sec-fetch-dest": 'empty',
            "sec-fetch-mode": 'cors',
            "sec-fetch-site": 'same-origin',
            "user-agent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
            "x-csrf-token": 'f67e663663e0381be075837e4299747e4a4c9d16',
            "x-requested-with": 'XMLHttpRequest',
        };

        {
            const applicants = await fetchApplicants({ url, headers, counsellorId: 16101702, from: new Date(2026, 8, 8), to: new Date(2026, 8, 8) });
            console.log(applicants.map(v => v.applicationNumber + " - " + v.registeredName).join("\n"));
            expect(applicants.length).toBeGreaterThan(0);
        }

        {
            const applicants = await fetchApplicants({ url, headers, counsellorId: 16101702, from: new Date(2026, 8, 7), to: new Date(2026, 8, 7) });
            console.log(applicants.map(v => v.applicationNumber + " - " + v.registeredName).join("\n"));
            expect(applicants.length).toBeGreaterThan(0);
        }

        {
            const applicants = await fetchApplicants({ url, headers, counsellorId: 16044517, from: new Date(2026, 8, 9), to: new Date(2026, 8, 9) });
            console.log(applicants.map(v => v.applicationNumber + " - " + v.registeredName).join("\n"));
            expect(applicants.length).toBeGreaterThan(0);
        }

        {
            const applicants = await fetchApplicants({ url, headers, counsellorId: 16044517, from: new Date(2026, 8, 0), to: new Date(2026, 8, 29) });
            console.log(applicants.map(v => v.applicationNumber + " - " + v.registeredName).join("\n"));
            expect(applicants.length).toBeGreaterThan(0);
        }
    });
});

/*
_gcl_au=1.1.742544991.1788413841
_ga=GA1.2.1555086342.1788413841
_ga=GA1.4.1555086342.1788413841
csrfToken=0d4285333a89aecd7ec3651841f441a310d2fb95
npfwg=1
npf_r=
npf_l=nop4jqg9x3.in1.nopaperforms.io
npf_u=https://nop4jqg9x3.in1.nopaperforms.io/counsellors/dashboard
NPFSSID=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjE2MDYzMjQ0LCJ1dHlwZSI6Imluc3RpdHV0ZSIsImNpZCI6MjU3LCJleHAiOjE3ODkwNzUwNzEsInVzaWQiOiJkNWZkODQ4MTAxNzg0ZTZhODA4YzU1NDVkNTQ3ZTBkOCJ9.KT9u2XkbHUiMAk1kNMF029sPwXrT510z0E3htL-Z-QU
UserGroup=Q2FrZQ%3D%3D.MzlkOGE4NDU1YTFiMzU3Y2NmY2RkMTA4NjMyZGU4NGVhYjY5ZmU2MDI2NjliMGZmOTU1NjI5NjliYzM2ZDVlN5sxjl%2FKErioVVnfMj46cXDv%2Fm2wefbJw4gapgfOeu0s
_gid=GA1.2.1221942505.1789039076
_gid=GA1.4.1221942505.1789039076
_clck=1kxtho4%5E2%5Eg9c%5E0%5E2437
_ga_S234BK01XY=GS2.2.s1789039077$o7$g1$t1789039081$j56$l0$h0
_ga_N5TPBCT4KM=GS2.4.s1789039077$o7$g1$t1789039081$j56$l0$h0
_clsk=1vif4ss%5E1789039081866%5E2%5E1%5Ea.clarity.ms%2Fcollect
hsclg=257
AWSALB=8BCN6RdchgIT+I9F4NUpZS2/XHoZKe7koH1u4XTE6WRfCdimTuCdbZd990do2OKRWZWq3ImcwF+tRgF9I5PSpT/Hmi5stcIhaZTJtu5rYFlJbooIQDtLdttwwqBJ
AWSALBCORS=8BCN6RdchgIT+I9F4NUpZS2/XHoZKe7koH1u4XTE6WRfCdimTuCdbZd990do2OKRWZWq3ImcwF+tRgF9I5PSpT/Hmi5stcIhaZTJtu5rYFlJbooIQDtLdttwwqBJ
AMP_95bf0ea3fa=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjI4NzJjODg3Ni1jODVhLTRmYjctOTE3ZS0xZTY0MGIxOGYzMmMlMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjIxNjA2MzI0NCUyMiUyQyUyMnNlc3Npb25JZCUyMiUzQTE3ODkwMzkwNzQ0MzIlMkMlMjJvcHRPdXQlMjIlM0FmYWxzZSUyQyUyMmxhc3RFdmVudFRpbWUlMjIlM0ExNzg5MDM5MTgzODIwJTJDJTIybGFzdEV2ZW50SWQlMjIlM0E1NjclMkMlMjJwYWdlQ291bnRlciUyMiUzQTAlMkMlMjJjb29raWVEb21haW4lMjIlM0ElMjIubm9wYXBlcmZvcm1zLmlvJTIyJTdE
*/
